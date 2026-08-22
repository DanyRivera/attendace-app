export type TodayAttendanceData = {
  day_id: string | null;
  work_date: string;
  first_clock_in: string | null;
  latest_clock_in: string | null;
  last_clock_out: string | null;
  open_period_id: string | null;
  open_started_at: string | null;
  worked_minutes: number;
  is_paid: boolean;
  server_now: string;
};

export type RegisterTimeData = {
  action: "clock_in" | "clock_out";
};

export type RegisterTimeResult =
  | {
      success: true;
      action: RegisterTimeData["action"];
    }
  | {
      success: false;
      code: string;
      message: string;
    };

export type GetWorkerTimeResult =
  | {
      success: true;
      data: TodayAttendanceData;
    }
  | {
      success: false;
      code: string;
      message: string;
    };
