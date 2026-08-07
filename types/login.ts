import type { Path, RegisterOptions } from "react-hook-form";

export type LoginFormData = {
  email: string;
  password: string;
};

export type LoginField = {
  name: Path<LoginFormData>;
  label: string;
  type: "email" | "password";
  placeholder: string;
  rules: RegisterOptions<LoginFormData, Path<LoginFormData>>;
};
