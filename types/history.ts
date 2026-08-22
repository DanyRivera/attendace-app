export type HistoryGroup = {
  label: string;
  days: HistoryDayData[];
};

export type HistoryPeriodData = {
  id: string;
  started_at: string;
  ended_at: string | null;
};

export type HistoryDayData = {
  id: string;
  work_date: string;
  is_paid: boolean;
  paid_at: string | null;
  periods: HistoryPeriodData[];
};

export type HistoryDayCardProps = {
  day: HistoryDayData;
};

export type GetWorkerHistoryResult =
  | {
      success: true;
      data: HistoryDayData[];
    }
  | {
      success: false;
      code: string;
      message: string;
    };
