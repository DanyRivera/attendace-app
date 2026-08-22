export type PendingPaymentDay = {
  day_id: string;
  work_date: string;
  worked_minutes: number;
  hourly_salary: number;
  estimated_amount: number;
};

export type GetPendingPaymentDaysResult =
  | {
      success: true;
      data: PendingPaymentDay[];
    }
  | {
      success: false;
      code: string;
      message: string;
    };

export type RegisterWorkerPaymentInput = {
  worker_id: string;
  day_ids: string[];
};

export type RegisteredPaymentData = {
  payment_id: string;
  worker_id: string;
  paid_days: number;
  total_minutes: number;
  salary: number;
  total_amount: number;
  paid_at: string;
};

export type RegisterWorkerPaymentResult =
  | {
      success: true;
      data: RegisteredPaymentData;
      message: string;
    }
  | {
      success: false;
      code: string;
      message: string;
    };
