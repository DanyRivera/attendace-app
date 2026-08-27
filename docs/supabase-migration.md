# Migrar Supabase local a producción

Guía para trasladar la estructura de una base de datos desarrollada con Supabase CLI y Docker hacia un proyecto limpio de Supabase Cloud.

El procedimiento está pensado para proyectos donde el esquema se creó inicialmente con SQL manual o snippets y todavía no existe un historial confiable en `supabase/migrations/`.

Time Check se usa como ejemplo, pero los comandos y controles son reutilizables en otros proyectos.

## Alcance

Esta guía migra únicamente la estructura:

- Tablas y secuencias.
- Llaves foráneas, restricciones e índices.
- Funciones y RPC.
- Políticas RLS y permisos.
- Extensiones de PostgreSQL.
- Jobs de Supabase Cron.

No migra:

- Usuarios locales de `auth.users`.
- Empresas, trabajadores o datos de prueba.
- Asistencias, pagos o archivos locales.
- Contraseñas, tokens o variables de entorno.
- Configuración SMTP o proveedores externos de Auth.

Si necesitas conservar datos reales, primero diseña un procedimiento específico de respaldo, orden de importación y validación de integridad. No uses directamente este flujo destructivo.

## Conceptos

### Snippet

Un snippet es SQL que se ejecuta manualmente. Supabase no registra necesariamente cuándo se ejecutó, en qué orden ni si posteriormente fue reemplazado.

Los snippets son útiles para experimentar, pero no deben ser la fuente oficial de producción.

### Migración

Una migración es un archivo SQL ordenado por una marca de tiempo:

```text
supabase/migrations/20260821025954_initial_schema.sql
supabase/migrations/20260821031801_attendance_cron.sql
```

Supabase registra las versiones aplicadas en la base remota y `db push` ejecuta únicamente las que faltan.

Una migración que ya fue aplicada en producción debe considerarse inmutable. Cualquier corrección posterior debe agregarse en una migración nueva.

### Base sombra

`supabase db diff` crea una base temporal, aplica las migraciones existentes y la compara con otra base. Esto permite generar SQL y detectar drift sin modificar la base de trabajo.

### Drift

Existe drift cuando la base real y los archivos de migración describen estructuras distintas. Ocurre normalmente al ejecutar SQL manual en Studio sin crear después una migración equivalente.

## Requisitos

- Docker funcionando.
- Supabase local iniciado.
- Supabase CLI instalado en el proyecto.
- Esquema local en su estado final y funcional.
- Acceso a un proyecto limpio de Supabase Cloud.
- Contraseña de PostgreSQL del proyecto Cloud.
- Acceso al proveedor donde se desplegará la aplicación.

Los ejemplos usan pnpm:

```powershell
pnpm exec supabase --version
```

En otro proyecto puedes sustituir `pnpm exec` por el mecanismo utilizado para ejecutar su CLI.

Nunca pegues en documentación, GitHub, tickets o chats:

- `SUPABASE_SERVICE_ROLE_KEY`.
- Claves `sb_secret_...`.
- Contraseña de PostgreSQL.
- Tokens de Supabase CLI.
- Secretos SMTP.
- URLs de PostgreSQL con credenciales.

## 1. Verificar Supabase local

Consulta el estado:

```powershell
pnpm exec supabase status
```

Si no está iniciado:

```powershell
pnpm run supabase:start
```

Confirma que aparecen al menos la API, Studio y PostgreSQL local.

La salida de `supabase status` incluye claves locales. Aunque sean para desarrollo, no deben copiarse a archivos versionados.

## 2. Revisar errores del esquema

Ejecuta el linter contra `public`:

```powershell
pnpm exec supabase db lint --local --schema public --level error
```

Resultado esperado:

```text
No schema errors found
```

El linter detecta varios errores de tipos y referencias en funciones, pero no demuestra que la lógica de negocio o las políticas RLS sean correctas. La revisión de seguridad sigue siendo obligatoria.

## 3. Generar una migración inicial

Si no existen migraciones y la base local contiene el estado final:

```powershell
pnpm exec supabase db diff --local --schema public -f initial_schema
```

Forma explícita equivalente:

```powershell
pnpm exec supabase db diff --from migrations --to local --schema public -f initial_schema
```

El CLI crea un archivo parecido a:

```text
supabase/migrations/<timestamp>_initial_schema.sql
```

Este comando crea un archivo, pero no cambia la base local ni la remota.

El diff limita su alcance a `public`. Configuración de Auth, datos de `cron.job` y otros esquemas administrados pueden requerir migraciones o configuración separadas.

## 4. Revisar manualmente el SQL generado

El generador de diferencias no es un auditor de seguridad. Nunca apliques automáticamente el archivo inicial sin revisarlo.

### Objetos esperados

Verifica que incluya:

- Todas las tablas de la aplicación.
- Secuencias con el valor inicial correcto.
- Llaves primarias y foráneas.
- Restricciones `check`, `unique` y de exclusión.
- Índices.
- Funciones vigentes.
- RLS habilitado.
- Policies de lectura y escritura esperadas.
- `revoke` y `grant` con privilegio mínimo.

### Datos que no deben aparecer

Una migración de estructura no debe contener datos reales ni comandos destructivos:

```sql
insert into public.users ...;
delete from public.days ...;
truncate table public.payments ...;
```

Los `insert`, `update` o `delete` que formen parte del cuerpo de una RPC sí pueden ser válidos. Revisa el contexto.

### Extensiones

Declara las extensiones antes de los objetos que dependen de ellas.

Ejemplo para una exclusión GiST con UUID:

```sql
create extension if not exists btree_gist
with schema extensions;
```

Sin `btree_gist`, una restricción como esta puede fallar en una base limpia:

```sql
exclude using gist (
  day_id with =,
  tstzrange(started_at, ended_at, '[)') with &&
);
```

### Funciones `SECURITY DEFINER`

Una función `SECURITY DEFINER` ejecuta con privilegios de su propietario. Debe validar identidad, rol y pertenencia a la organización.

Debe usar un `search_path` seguro:

```sql
security definer
set search_path = ''
```

Y nombres calificados:

```sql
select * from public.users;
```

PostgreSQL concede `EXECUTE` a `PUBLIC` por defecto al crear una función. Dar acceso a `service_role` no elimina ese permiso.

Para una RPC exclusivamente administrativa:

```sql
revoke all
on function public.example_admin_function(uuid)
from public, anon, authenticated;

grant execute
on function public.example_admin_function(uuid)
to service_role;
```

Para una RPC destinada a usuarios autenticados:

```sql
revoke all
on function public.example_user_function()
from public, anon, authenticated;

grant execute
on function public.example_user_function()
to authenticated;
```

### Funciones obsoletas y sobrecargas

Busca funciones duplicadas con el mismo nombre y distinta firma. Una versión antigua puede seguir expuesta por PostgREST aunque la aplicación ya no la utilice.

Ejemplo:

```text
register_company_admin(text, text, text, ...)
register_company_admin(uuid, text, text, ...)
```

Conserva únicamente la firma vigente o revoca explícitamente cualquier versión necesaria.

### Privilegios peligrosos

Revisa especialmente estos privilegios para `anon` y `authenticated`:

```text
TRUNCATE
TRIGGER
REFERENCES
MAINTAIN
UPDATE sobre secuencias
```

RLS no protege `TRUNCATE`.

Para una tabla de lectura:

```sql
revoke all
on table public.users
from anon, authenticated;

grant select
on table public.users
to authenticated;
```

Para una secuencia controlada por procesos privilegiados:

```sql
revoke all
on sequence public.company_code_seq
from anon, authenticated;

grant usage, select, update
on sequence public.company_code_seq
to service_role;
```

### Caso encontrado en Time Check

El diff inicial de Time Check requirió estas correcciones antes de producción:

- Agregar `btree_gist`.
- Retirar `TRUNCATE` de `anon` y `authenticated`.
- Retirar `UPDATE` de una secuencia para clientes.
- Eliminar una firma obsoleta de `register_company_admin`.
- Revocar el acceso público de la firma vigente.
- Cambiar la función vigente a `search_path = ''`.

Este caso demuestra por qué el warning de `db diff` debe tomarse en serio.

## 5. Crear migraciones para componentes externos

Los jobs de Cron viven fuera de `public` y pueden no aparecer en el diff inicial.

Crea una migración independiente:

```powershell
pnpm exec supabase migration new attendance_cron
```

Ejemplo:

```sql
create extension if not exists pg_cron;

select cron.schedule(
  'close-expired-attendance-periods',
  '30 3 * * *',
  $job$
    select public.close_expired_attendance_periods();
  $job$
);
```

Consideraciones:

- El nombre del job debe ser estable.
- La función invocada debe existir en una migración anterior.
- La zona horaria del schedule debe verificarse para el negocio.
- La función debe ser idempotente.
- `anon` y `authenticated` no deben poder ejecutar funciones internas de mantenimiento.

En Time Check, `30 3 * * *` equivale a las 21:30 del día anterior en `America/Mexico_City` bajo las reglas horarias actuales. La función guarda `ended_at` exactamente a las 21:30 aunque el job inicie unos segundos después.

## 6. Reconstruir la base local desde cero

> [!CAUTION]
> Este comando elimina todos los datos locales, incluyendo usuarios de Auth, empresas, asistencias y pagos.

Si los datos locales son descartables:

```powershell
pnpm exec supabase db reset --local --no-seed
```

`--no-seed` evita insertar datos de prueba durante esta validación.

El resultado debe mostrar cada migración en orden:

```text
Applying migration <timestamp>_initial_schema.sql...
Applying migration <timestamp>_attendance_cron.sql...
```

Si una migración falla aquí, no debe enviarse a producción.

Nunca sustituyas `--local` por `--linked` sin una decisión explícita y un respaldo verificado.

## 7. Validar la base reconstruida

Ejecuta nuevamente el linter:

```powershell
pnpm exec supabase db lint --local --schema public --level error
```

Comprueba que no exista drift:

```powershell
pnpm exec supabase db diff --from migrations --to local --schema public
```

Un resultado correcto no imprime SQL adicional.

Verifica el job local:

```powershell
docker exec <CONTENEDOR_POSTGRES> psql -U postgres -d postgres -c "select jobid, jobname, schedule, active from cron.job;"
```

Ejemplo de nombre local:

```text
supabase_db_nombre-del-proyecto
```

## 8. Crear el proyecto de Supabase Cloud

Desde Supabase Dashboard:

1. Crea un proyecto limpio.
2. Elige una región adecuada.
3. Guarda la contraseña de PostgreSQL en un gestor de secretos.
4. Confirma la versión principal de PostgreSQL.

En SQL Editor:

```sql
show server_version;
```

La versión principal debe coincidir con `supabase/config.toml`:

```toml
[db]
major_version = 17
```

Una base local PostgreSQL 17 y una remota 17.x son compatibles para este propósito.

## 9. Autenticar y enlazar Supabase CLI

Inicia sesión:

```powershell
pnpm exec supabase login
```

No compartas el token generado.

Obtén el Project Ref desde la URL del Dashboard:

```text
https://supabase.com/dashboard/project/PROJECT_REF
```

Enlaza el proyecto:

```powershell
pnpm exec supabase link --project-ref PROJECT_REF
```

El CLI puede solicitar la contraseña de PostgreSQL. No la escribas en comandos que puedan quedar en el historial.

Comprueba las migraciones:

```powershell
pnpm exec supabase migration list --linked
```

Antes del primer push, las versiones deben aparecer en `Local` y vacías en `Remote`.

## 10. Simular el push

Ejecuta siempre un dry run:

```powershell
pnpm exec supabase db push --linked --dry-run
```

Revisa que solo liste migraciones esperadas:

```text
Would push these migrations:
 • <timestamp>_initial_schema.sql
 • <timestamp>_attendance_cron.sql
```

Si aparece una migración desconocida, detente y revisa el historial local y remoto.

## 11. Aplicar migraciones en producción

> [!WARNING]
> Este comando modifica la base enlazada. Verifica el Project Ref y el dry run antes de confirmar.

```powershell
pnpm exec supabase db push --linked
```

No cierres la terminal mientras se aplican las migraciones.

Resultado esperado:

```text
Applying migration <timestamp>_initial_schema.sql...
Applying migration <timestamp>_attendance_cron.sql...
Finished supabase db push.
```

## 12. Validar producción

Comprueba el historial remoto:

```powershell
pnpm exec supabase migration list --linked
```

Cada versión debe aparecer en `Local` y `Remote`.

Ejecuta el linter remoto:

```powershell
pnpm exec supabase db lint --linked --schema public --level error
```

En SQL Editor verifica el job:

```sql
select
  jobid,
  jobname,
  schedule,
  active
from cron.job
where jobname = 'close-expired-attendance-periods';
```

Revisa también:

- Tablas esperadas.
- RLS habilitado.
- Policies correctas.
- Firmas de RPC.
- Permisos de funciones sensibles.
- Extensiones habilitadas.
- Historial de ejecución de Cron.

## 13. Configurar el despliegue

Para una aplicación Next.js con Supabase, configura las variables del proyecto Cloud en el proveedor de hosting:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` debe existir solo en el servidor. Nunca uses el prefijo `NEXT_PUBLIC_` para esa clave.

Si el despliegue responde HTTP 500, comprueba primero:

- Que las tres variables existan.
- Que correspondan a Supabase Cloud y no a `127.0.0.1`.
- Que estén habilitadas para el entorno Production.
- Que se haya realizado un redeploy después de agregarlas.

## 14. Configurar Supabase Auth

Cuando exista una URL pública, abre:

```text
Authentication → URL Configuration
```

Configura la dirección canónica:

```text
Site URL: https://app.example.com
```

Agrega redirects permitidos:

```text
https://app.example.com/**
http://localhost:3000/**
http://127.0.0.1:3000/**
```

No agregues dominios que no controles. Las Redirect URLs previenen que enlaces de recuperación, confirmación u OAuth terminen en sitios maliciosos.

No ejecutes `supabase config push` usando un `config.toml` que todavía tenga `site_url` local. Puedes configurar Auth manualmente en Dashboard o preparar primero una configuración apropiada.

## 15. Pruebas funcionales

Después de migrar, prueba como mínimo:

- Registro del primer administrador y empresa.
- Login del administrador.
- Registro de un trabajador.
- Login del trabajador.
- Restricción de rutas por rol.
- Entrada y salida.
- Historial del trabajador.
- Dashboard administrativo.
- Actualización de sueldo.
- Cálculo y registro de pago.
- Lectura de pagos y jornadas mediante RLS.
- Ejecución del job programado.
- Errores de permisos entre empresas distintas.

Una migración aplicada correctamente no garantiza que las variables, Auth o reglas de negocio funcionen.

## 16. Errores comunes

### `TransportError` al conectar

Reintenta con debug:

```powershell
pnpm exec supabase migration list --linked --debug
```

Antes de compartir logs, elimina:

- Encabezados `Authorization`.
- Tokens.
- Contraseñas.
- URLs PostgreSQL con credenciales.

Un `TransportError` puede ser transitorio mientras el proyecto termina de inicializar su rol temporal.

### `JWT issued at future`

Indica una diferencia temporal entre el emisor del token y quien lo valida. En desarrollo puede ocurrir después de reiniciar Docker o Supabase.

Acciones:

1. Recarga la página.
2. Cierra sesión y vuelve a entrar.
3. Elimina cookies de `localhost` o `127.0.0.1`.
4. Reinicia Docker si persiste.
5. Verifica la sincronización del reloj del sistema.

### HTTP 500 después de desplegar

La causa frecuente es una variable de entorno ausente o que todavía apunta a Supabase local.

Comprueba los logs del hosting y realiza un redeploy después de corregir variables.

### El diff vuelve a mostrar permisos antiguos

Si corriges manualmente una migración inicial y luego comparas contra la base local original, el diff mostrará SQL para restaurar el estado antiguo.

Esto no significa que haya aplicado esos permisos. Significa que la migración segura y la base local antigua son distintas.

Ejecuta `db reset --local --no-seed` para reconstruir local desde la migración y luego vuelve a comprobar drift.

### El job no aparece

Verifica:

```sql
select * from cron.job;
```

Si el esquema `cron` no existe, confirma que `pg_cron` esté disponible y que la migración que crea la extensión se haya aplicado.

### El CLI anuncia una versión nueva

Una advertencia de actualización no invalida una operación exitosa. Actualiza el CLI de forma controlada y vuelve a ejecutar reset, lint y diff antes de usar la nueva versión para producción.

## 17. Operaciones prohibidas o delicadas

No ejecutes en producción sin un plan explícito:

```powershell
pnpm exec supabase db reset --linked
```

Tampoco ejecutes snippets de pruebas que contengan:

```sql
truncate ...;
delete from auth.users ...;
drop table ...;
```

No edites una migración que ya aparece en la columna `Remote` de `migration list`. Crea una nueva migración correctiva.

No uses SQL manual en producción sin guardar el cambio equivalente en Git. De lo contrario introduces drift.

## 18. Flujo para cambios futuros

Después de establecer la migración inicial, el flujo normal es:

1. Cambiar el esquema local.
2. Crear una migración descriptiva.
3. Revisar el SQL.
4. Reconstruir local desde migraciones.
5. Ejecutar lint.
6. Confirmar que no exista drift.
7. Hacer commit de la migración.
8. Ejecutar dry run contra producción.
9. Aplicar con `db push`.
10. Validar producción.

Para generar cambios detectados localmente:

```powershell
pnpm exec supabase db diff --local --schema public -f descripcion_del_cambio
```

Para escribir una migración manual:

```powershell
pnpm exec supabase migration new descripcion_del_cambio
```

Cada cambio debe tener una única responsabilidad. Ejemplos:

```text
add_payment_cancellation
add_password_audit
restrict_worker_email_update
```

## 19. Checklist final

- [ ] Supabase local funciona.
- [ ] `db lint --local` no reporta errores.
- [ ] La migración inicial fue revisada manualmente.
- [ ] No hay datos ni secretos en migraciones.
- [ ] `SECURITY DEFINER` usa `search_path` seguro.
- [ ] No existen funciones obsoletas expuestas.
- [ ] `anon` y `authenticated` tienen privilegio mínimo.
- [ ] Extensiones requeridas están declaradas.
- [ ] Cron está en una migración reproducible.
- [ ] `db reset --local` aplica todas las migraciones.
- [ ] El diff final no muestra drift.
- [ ] PostgreSQL local y Cloud tienen la misma versión principal.
- [ ] `db push --dry-run` lista solo cambios esperados.
- [ ] Migraciones locales y remotas coinciden.
- [ ] `db lint --linked` no reporta errores.
- [ ] Jobs remotos están activos.
- [ ] Variables del hosting usan el proyecto Cloud.
- [ ] `Site URL` y Redirect URLs son correctas.
- [ ] Se completaron pruebas funcionales y de permisos.
- [ ] Las migraciones están versionadas en Git.

## Ejemplo de Time Check

Estado validado durante la migración inicial:

```text
PostgreSQL local: 17
PostgreSQL Cloud: 17.6
Aplicación: https://time-check-app.vercel.app
Migraciones:
  20260821025954_initial_schema.sql
  20260821031801_attendance_cron.sql
Cron:
  close-expired-attendance-periods
  30 3 * * *
```

Este bloque no contiene Project Ref, claves, contraseñas ni URLs privadas de PostgreSQL.
