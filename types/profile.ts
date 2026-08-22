import type { Path, RegisterOptions } from "react-hook-form";

export type ProfileFormData = {
  name: string;
  lastName: string;
  phone: string;
  companyName: string;
  companyDirection: string;
  companyPhone: string;
};

export type ProfileFieldDefinition = {
  name: Path<ProfileFormData>;
  label: string;
  type: "text" | "email" | "tel";
  placeholder: string;
  rules: RegisterOptions<ProfileFormData, Path<ProfileFormData>>;
};

export type ProfileUserData = {
  name: string;
  lastName: string;
  email: string;
  phone: string;
  isAdmin: boolean;
  company: {
    name: string;
    direction: string;
    phone: string;
    code: string;
  } | null;
};


export type UpdateProfileResult =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      code: string;
      message: string;
    };