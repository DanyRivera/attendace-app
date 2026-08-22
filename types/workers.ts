export type WorkerCardData = {
  id: string;
  name: string;
  last_name: string;
  email: string;
  phone: string;
  salary: number;
};


export type CompanyWorkerData = {
  id: string;
  name: string;
  last_name: string;
  email: string;
  phone: string;
  salary: number;
};

export type GetCompanyWorkersResult =
  | {
    success: true;
    data: CompanyWorkerData[];
  }
  | {
    success: false;
    code: string;
    message: string;
  };


export type WorkerUpdateSalaryData = {
  worker_id: string;
  salary: number;
};

export type UpdateSalaryResult =
  | {
    success: true;
    data: WorkerUpdateSalaryData;
    message: string;
  }
  | {
    success: false;
      code: string;
      message: string;
    };
