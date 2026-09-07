-- Allow a closed attendance day to be paid on its own work date.
-- The function definitions come from the preceding schema migration; these
-- guards prevent silently applying the change to an unexpected definition.
do $migration$
declare
  v_definition text;
  v_current_condition text;
  v_updated_condition text;
begin
  v_definition := pg_get_functiondef(
    'public.get_worker_pending_payments(uuid)'::regprocedure
  );
  v_current_condition := 'and days.work_date < v_work_date';
  v_updated_condition := 'and days.work_date <= v_work_date';

  if strpos(v_definition, v_current_condition) = 0 then
    raise exception
      'Unexpected get_worker_pending_payments definition';
  end if;

  execute replace(
    v_definition,
    v_current_condition,
    v_updated_condition
  );

  v_definition := pg_get_functiondef(
    'public.register_worker_payment(uuid,uuid[])'::regprocedure
  );
  v_current_condition := 'and days.work_date < v_today';
  v_updated_condition := 'and days.work_date <= v_today';

  if strpos(v_definition, v_current_condition) = 0 then
    raise exception
      'Unexpected register_worker_payment definition';
  end if;

  execute replace(
    v_definition,
    v_current_condition,
    v_updated_condition
  );
end;
$migration$;
