"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";
import FormField from "@/components/forms/FormField";
import SectionHeading from "@/components/forms/SectionHeading";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import type {
  ProfileFieldDefinition,
  ProfileFormData,
  ProfileUserData,
} from "@/types/profile";
import { updateProfile } from "@/actions/profile";

// Valida que el telefono contenga exactamente diez digitos.
const phoneValidation = (value: string) =>
  value.replace(/\D/g, "").length === 10 ||
  "El telefono debe tener 10 digitos";

const personalFields: ProfileFieldDefinition[] = [
  {
    name: "name",
    label: "Nombre",
    type: "text",
    placeholder: "Tu nombre",
    rules: {
      required: "El nombre es obligatorio",
      minLength: { value: 2, message: "Usa al menos 2 caracteres" },
    },
  },
  {
    name: "lastName",
    label: "Apellido",
    type: "text",
    placeholder: "Tu apellido",
    rules: {
      required: "El apellido es obligatorio",
      minLength: { value: 2, message: "Usa al menos 2 caracteres" },
    },
  },
  {
    name: "phone",
    label: "Teléfono personal",
    type: "tel",
    placeholder: "55 0000 0000",
    rules: {
      required: "El teléfono es obligatorio",
      validate: phoneValidation,
    },
  },
];

const companyFields: ProfileFieldDefinition[] = [
  {
    name: "companyName",
    label: "Nombre de la empresa",
    type: "text",
    placeholder: "Nombre comercial",
    rules: {
      required: "El nombre de la empresa es obligatorio",
      minLength: { value: 2, message: "Usa al menos 2 caracteres" },
    },
  },
  {
    name: "companyDirection",
    label: "Dirección",
    type: "text",
    placeholder: "Calle, número, ciudad",
    rules: {
      required: "La dirección es obligatoria",
      minLength: { value: 5, message: "Ingresa una dirección válida" },
    },
  },
  {
    name: "companyPhone",
    label: "Teléfono de la empresa",
    type: "tel",
    placeholder: "55 0000 0000",
    rules: {
      required: "El teléfono de la empresa es obligatorio",
      validate: phoneValidation,
    },
  },
];

type ProfileFormProps = {
  user: ProfileUserData;
};

// Renderiza y valida localmente los datos editables del perfil.
export default function ProfileForm({ user }: ProfileFormProps) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: user.name,
      lastName: user.lastName,
      phone: user.phone,
      companyName: user.company?.name ?? "",
      companyDirection: user.company?.direction ?? "",
      companyPhone: user.company?.phone ?? "",
    },
    mode: "onBlur",
  });

  const onSubmit = async (data: ProfileFormData) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    try {
      const res = await updateProfile(data);

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      reset(data);
      toast.success(res.message);
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error inesperado. Intenta nuevamente.");
    }
  };

  return (
    <>
      <LoadingOverlay
        description="Estamos guardando los cambios de tu perfil..."
        isOpen={isSubmitting}
        title="Actualizando perfil"
      />

      <form
        aria-busy={isSubmitting}
        className="relative rounded-4xl border border-white/80 bg-white/82 p-5 shadow-[0_24px_80px_rgba(46,167,162,0.12)] backdrop-blur sm:p-8 lg:p-10"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
      >
      <div className={user.isAdmin ? "grid gap-10 lg:grid-cols-2 lg:gap-12" : ""}>
        <section>
          <SectionHeading
            eyebrow="01"
            label="Cuenta"
            title="Datos personales"
          />

          <div
            className={`grid gap-5 ${user.isAdmin ? "sm:grid-cols-2 lg:grid-cols-1" : "sm:grid-cols-2"}`}
          >
            {personalFields.map((field) => (
              <FormField
                error={errors[field.name]?.message}
                key={field.name}
                register={register}
                {...field}
              />
            ))}
          </div>

          <div className="relative mt-6 overflow-hidden rounded-3xl bg-primary/8 p-5 ring-1 ring-primary/15">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
            <div className="relative">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Correo electrónico
                  </p>
                  <p className="mt-1 text-xs leading-5 text-foreground/45">
                    Este correo está vinculado al acceso de tu cuenta.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-primary ring-1 ring-primary/15">
                  Solo lectura
                </span>
              </div>

              <input
                aria-label="Correo electrónico"
                className="h-13 w-full cursor-text rounded-2xl border border-primary/15 bg-white/75 px-4 text-base font-medium text-foreground outline-none selection:bg-primary/20"
                readOnly
                type="email"
                value={user.email}
              />
            </div>
          </div>
        </section>

        {user.isAdmin && (
          <section className="border-t border-black/8 pt-10 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            <SectionHeading
              eyebrow="02"
              label="Organización"
              title="Datos de la empresa"
            />

            <div className="grid gap-5">
              {companyFields.map((field) => (
                <FormField
                  error={errors[field.name]?.message}
                  key={field.name}
                  register={register}
                  {...field}
                />
              ))}
            </div>

            <div className="relative mt-6 overflow-hidden rounded-3xl bg-secondary/8 p-5 ring-1 ring-secondary/15">
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-secondary/20 blur-2xl" />
              <div className="relative">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Código de empresa
                    </p>
                    <p className="mt-1 text-xs leading-5 text-foreground/45">
                      Compártelo con quienes se unirán a tu organización.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-secondary ring-1 ring-secondary/15">
                    Solo lectura
                  </span>
                </div>

                <input
                  aria-label="Código de empresa"
                  className="h-13 w-full cursor-text rounded-2xl border border-secondary/15 bg-white/75 px-4 font-mono text-base font-bold tracking-[0.12em] text-foreground outline-none selection:bg-secondary/20"
                  readOnly
                  type="text"
                  value={user.company?.code ?? "No disponible"}
                />
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="mt-10 border-t border-black/8 pt-7 sm:flex sm:items-center sm:justify-end">
        <button
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-linear-to-r from-primary to-[#35c4bd] px-8 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/30 active:translate-y-0 disabled:cursor-wait disabled:opacity-75 sm:w-auto"
          disabled={isSubmitting}
          type="submit"
        >
          Actualizar perfil
        </button>
      </div>
      </form>
    </>
  );
}
