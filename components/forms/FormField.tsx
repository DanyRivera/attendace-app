import type { InputHTMLAttributes } from "react";
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
  return (
    <label className="group block" htmlFor={name}>
      <span className="mb-2 block text-sm font-semibold text-foreground/70 transition group-focus-within:text-primary">
        {label}
      </span>
      <input
        aria-invalid={Boolean(error)}
        className={`h-14 w-full rounded-2xl border bg-background/70 px-4 text-base font-medium text-foreground outline-none transition placeholder:text-foreground/30 focus:bg-white focus:ring-4 ${error ? "border-danger focus:border-danger focus:ring-danger/10" : "border-black/8 focus:border-primary focus:ring-primary/10"}`}
        id={name}
        placeholder={placeholder}
        type={type}
        {...register(name, rules)}
      />
      {error ? (
        <span className="mt-2 block text-xs font-medium text-danger">
          {error}
        </span>
      ) : null}
    </label>
  );
}
