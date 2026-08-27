"use client";

import { useState, type InputHTMLAttributes } from "react";
import type {
  FieldValues,
  Path,
  RegisterOptions,
  UseFormRegister,
} from "react-hook-form";

type FormFieldProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  register: UseFormRegister<T>;
  rules?: RegisterOptions<T, Path<T>>;
  error?: string;
} & Pick<InputHTMLAttributes<HTMLInputElement>, "placeholder" | "type">;

export default function FormField<T extends FieldValues>({
  label,
  name,
  placeholder,
  register,
  rules,
  type,
  error,
}: FormFieldProps<T>) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div className="group block">
      <label
        className="mb-2 block text-sm font-semibold text-foreground/70 transition group-focus-within:text-primary"
        htmlFor={name}
      >
        {label}
      </label>

      <div className="relative">
        <input
          aria-invalid={Boolean(error)}
          className={`h-14 w-full rounded-2xl border bg-background/70 px-4 text-base font-medium text-foreground outline-none transition placeholder:text-foreground/30 focus:bg-white focus:ring-4 ${isPassword ? "pr-13" : ""} ${error ? "border-danger focus:border-danger focus:ring-danger/10" : "border-black/8 focus:border-primary focus:ring-primary/10"}`}
          id={name}
          placeholder={placeholder}
          type={inputType}
          {...register(name, rules)}
        />

        {isPassword && (
          <button
            aria-controls={name}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-foreground/35 outline-none transition hover:bg-primary/8 hover:text-primary focus-visible:bg-primary/8 focus-visible:text-primary focus-visible:ring-4 focus-visible:ring-primary/10"
            onClick={() => setShowPassword((current) => !current)}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            {showPassword ? (
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="m4 4 16 16M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 5.2A9.8 9.8 0 0 1 12 5c5.4 0 9 7 9 7a16.7 16.7 0 0 1-3 3.8M6.6 6.6C4.2 8.2 3 12 3 12s3.6 7 9 7a9.4 9.4 0 0 0 3.4-.6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.7"
                />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.7"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="2.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {error ? (
        <span className="mt-2 block text-xs font-medium text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}
