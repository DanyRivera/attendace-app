select
  jobid,
  jobname,
  schedule,
  command,
  active
from cron.job
where jobname = 'close-expired-attendance-periods';