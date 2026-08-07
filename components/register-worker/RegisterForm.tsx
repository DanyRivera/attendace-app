"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import FormField from "@/components/forms/FormField";
import SectionHeading from "@/components/forms/SectionHeading";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type {
  RegisterWorkerField,
  RegisterWorkerFormData,
} from "@/types/register-worker";
import { createWorker } from "@/actions/register";

const phoneValidation = (value: string) =>
  value.replace(/\D/g, "").length === 10 ||
  "El telefono debe tener 10 digitos";

const workerFields: RegisterWorkerField[] = [
  {
    name: "workerName",
    label: "Nombre",
    type: "text",
    placeholder: "Tu nombre",
    rules: {
      required: "El nombre es obligatorio",
      minLength: { value: 2, message: "Usa al menos 2 caracteres" },
    },
  },
  {
    name: "workerLastName",
    label: "Apellido",
    type: "text",
    placeholder: "Tu apellido",
    rules: {
      required: "El apellido es obligatorio",
      minLength: { value: 2, message: "Usa al menos 2 caracteres" },
    },
  },
  {
    name: "workerEmail",
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
    name: "workerPhone",
    label: "Telefono",
    type: "tel",
    placeholder: "+52 55 0000 0000",
    rules: {
      required: "El telefono es obligatorio",
      validate: phoneValidation,
    },
  },
  {
    name: "workerPassword",
    label: "Crea una contrasena",
    type: "password",
    placeholder: "********",
    rules: {
      required: "La contrasena es obligatoria",
      minLength: { value: 4, message: "Usa al menos 4 caracteres" },
    },
  },
  {
    name: "repeatWorkerPassword",
    label: "Repite tu contrasena",
    type: "password",
    placeholder: "********",
    rules: {
      required: "Confirma tu contrasena",
      minLength: { value: 4, message: "Usa al menos 4 caracteres" },
      validate: (value, formValues) =>
        value === formValues.workerPassword ||
        "Las contrasenas no coinciden",
    },
  },
];

const companyField: RegisterWorkerField = {
  name: "companyCode",
  label: "Codigo de la empresa",
  type: "text",
  placeholder: "DR-001000",
  rules: {
    required: "El codigo de empresa es obligatorio",
    minLength: { value: 4, message: "Ingresa un codigo valido" },
  },
};

export default function RegisterForm() {

  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset
  } = useForm<RegisterWorkerFormData>({ mode: "onBlur" });

  const onSubmit = async (data: RegisterWorkerFormData) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    try {
      const res = await createWorker(data);
      if (!res?.success) {
        toast.error(res?.message || "Ocurrio un error inesperado. Intenta nuevamente.");
        return;
      }

      toast.success(res?.message || "Colaborador creado con exito, inicia sesión");
      reset();
      setIsRedirecting(true);
      router.replace("/login");

    } catch (error) {
      console.error(error);
      toast.error("Ocurrio un error inesperado. Intenta nuevamente.");
    }
  }

  return (
    <>
      <LoadingOverlay
        description="Estamos validando tus datos y el codigo de empresa..."
        isOpen={isSubmitting || isRedirecting}
        title="Registrando colaborador"
      />

      <form
        aria-busy={isSubmitting}
        className="rounded-4xl bg-white/80 p-5 shadow-[0_24px_80px_rgba(46,167,162,0.14)] ring-1 ring-white/80 backdrop-blur sm:p-8 lg:p-10"
        onSubmit={handleSubmit(onSubmit)}
      >
      <SectionHeading
        eyebrow="01"
        label="Colaborador"
        title="Datos personales"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        {workerFields.map((field) => (
          <FormField
            error={errors[field.name]?.message}
            key={field.name}
            register={register}
            {...field}
          />
        ))}
      </div>

      <div className="my-8 h-px bg-black/8" />

      <div className="relative overflow-hidden rounded-3xl bg-secondary/8 p-5 ring-1 ring-secondary/15 sm:p-6">
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-secondary/15 blur-2xl" />
        <div className="relative">
          <p className="mb-1 text-sm font-bold text-foreground">
            Vincula tu cuenta
          </p>
          <p className="mb-5 text-sm leading-6 text-foreground/50">
            Solicita este codigo al administrador de tu empresa.
          </p>
          <FormField
            error={errors.companyCode?.message}
            register={register}
            {...companyField}
          />
        </div>
      </div>

      <div className="mt-8 border-t border-black/8 pt-7 sm:flex sm:justify-end">
        <button
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-linear-to-r from-secondary to-[#94b6f2] px-7 text-sm font-semibold text-white shadow-lg shadow-secondary/25 transition hover:-translate-y-1 hover:shadow-xl active:translate-y-0 disabled:cursor-wait disabled:opacity-75 sm:w-auto"
          disabled={isSubmitting}
          type="submit"
        >
          Registrar colaborador
        </button>
      </div>
      </form>
    </>
  );
}
