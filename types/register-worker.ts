import type { Path, RegisterOptions } from "react-hook-form";

export type RegisterWorkerFormData = {
  workerName: string;
  workerLastName: string;
  workerEmail: string;
  workerPhone: string;
  workerPassword: string;
  repeatWorkerPassword: string;
  companyCode: string;
};

export type RegisterWorkerField = {
  name: Path<RegisterWorkerFormData>;
  label: string;
  type: "text" | "email" | "tel" | "password";
  placeholder: string;
  rules: RegisterOptions<
    RegisterWorkerFormData,
    Path<RegisterWorkerFormData>
  >;
};
