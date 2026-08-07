import type { Path, RegisterOptions } from "react-hook-form";

export type RegisterAdminFormData = {
  adminName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string;
  adminPassword: string,
  repeatAdminPassword: string,
  companyName: string;
  companyAddress: string;
  companyPhone: string;
};

export type RegisterAdminField = {
  name: Path<RegisterAdminFormData>;
  label: string;
  type: "text" | "email" | "tel" | "password";
  placeholder: string;
  rules: RegisterOptions<RegisterAdminFormData, Path<RegisterAdminFormData>>;
};
