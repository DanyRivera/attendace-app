"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";
import FormField from "@/components/forms/FormField";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import SectionHeading from "@/components/forms/SectionHeading";
import type { LoginField, LoginFormData } from "@/types/login";
import { login } from "@/actions/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

const loginFields: LoginField[] = [
  {
    name: "email",
    label: "Correo electronico",
    type: "email",
    placeholder: "nombre@correo.com",
    rules: {
      required: "El correo es obligatorio",
      pattern: {
        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: "Ingresa un correo valido",
      },
    },
  },
  {
    name: "password",
    label: "Contrasena",
    type: "password",
    placeholder: "********",
    rules: {
      required: "La contrasena es obligatoria",
      minLength: { value: 4, message: "Usa al menos 4 caracteres" },
    },
  },
];

export default function LoginForm() {

  const [isRedirecting, setIsRedirecting] = useState(false);

  const router = useRouter();

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset
  } = useForm<LoginFormData>({ mode: "onBlur" });

  async function onSubmit(data: LoginFormData) {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    try {
      const res = await login(data);

      if (!res?.success) {
        toast.error(res?.message || 'Ocurrio un error inesperado. Intenta nuevamente.')
        return;
      }

      reset();
      setIsRedirecting(true);

      if (res.role === "admin") {
        router.replace("/dashboard");
      } else {
        router.replace("/time");
      }

    } catch (error) {
      console.error(error);
      toast.error("Ocurrio un error inesperado. Intenta nuevamente.");
    }
  }

  return (
    <>
      <LoadingOverlay
        description="Estamos verificando tus credenciales..."
        isOpen={isSubmitting || isRedirecting}
        title="Iniciando sesion"
      />

      <form
        aria-busy={isSubmitting}
        className="rounded-4xl bg-white/80 p-6 shadow-[0_24px_80px_rgba(46,167,162,0.14)] ring-1 ring-white/80 backdrop-blur sm:p-9"
        onSubmit={handleSubmit(onSubmit)}
      >
        <SectionHeading
          eyebrow="01"
          label="Acceso"
          title="Inicia Sesión"
        />

        <div className="grid gap-5">
          {loginFields.map((field) => (
            <FormField
              error={errors[field.name]?.message}
              key={field.name}
              register={register}
              {...field}
            />
          ))}
        </div>

        <button
          className="mt-8 flex h-14 w-full items-center justify-center rounded-2xl bg-linear-to-r from-primary to-[#35c4bd] px-7 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/30 active:translate-y-0 disabled:cursor-wait disabled:opacity-75"
          disabled={isSubmitting}
          type="submit"
        >
          Iniciar sesion
        </button>
      </form>
    </>
  );
}
