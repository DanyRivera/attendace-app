"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from 'sonner';
import { useRouter } from "next/navigation";
import FormField from "@/components/forms/FormField";
import SectionHeading from "@/components/forms/SectionHeading";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import type {
  RegisterAdminField,
  RegisterAdminFormData,
} from "@/types/register-admin";
import { createAdmin } from "@/actions/register"

const phonePattern = {
  value: /^[0-9+\s()-]{10,20}$/,
  message: "Ingresa un telefono valido",
};

const adminFields: RegisterAdminField[] = [
  {
    name: "adminName",
    label: "Nombre",
    type: "text",
    placeholder: "Tu nombre",
    rules: {
      required: "El nombre es obligatorio",
      minLength: { value: 2, message: "Usa al menos 2 caracteres" },
    },
  },
  {
    name: "adminLastName",
    label: "Apellido",
    type: "text",
    placeholder: "Tu apellido",
    rules: {
      required: "El apellido es obligatorio",
      minLength: { value: 2, message: "Usa al menos 2 caracteres" },
    },
  },
  {
    name: "adminPhone",
    label: "Telefono del encargado",
    type: "tel",
    placeholder: "+52 55 0000 0000",
    rules: { required: "El telefono es obligatorio", pattern: phonePattern },
  },
  {
    name: "adminEmail",
    label: "Correo electronico",
    type: "email",
    placeholder: "nombre@empresa.com",
    rules: {
      required: "El correo es obligatorio",
      pattern: {
        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: "Ingresa un correo valido",
      },
    },
  },
  {
    name: "adminPassword",
    label: "Crea una contraseña",
    type: "password",
    placeholder: "*******",
    rules: {
      required: "La contraseña es obligatoria",
      minLength: { value: 4, message: "Usa al menos 4 caracteres" },
    },
  },
  {
    name: "repeatAdminPassword",
    label: "Repite tu contraseña",
    type: "password",
    placeholder: "*******",
    rules: {
      required: "La contraseña es obligatoria",
      minLength: { value: 4, message: "Usa al menos 4 caracteres" },
    },
  },
];

const companyFields: RegisterAdminField[] = [
  {
    name: "companyName",
    label: "Nombre de la empresa",
    type: "text",
    placeholder: "Nombre comercial",
    rules: {
      required: "El nombre de la empresa es obligatorio",
      minLength: { value: 2, message: "Usa al menos 2 caracteres" },
    },
  },
  {
    name: "companyAddress",
    label: "Direccion",
    type: "text",
    placeholder: "Calle, numero, ciudad",
    rules: {
      required: "La direccion es obligatoria",
      minLength: { value: 5, message: "Ingresa una direccion valida" },
    },
  },
  {
    name: "companyPhone",
    label: "Telefono de la empresa",
    type: "tel",
    placeholder: "+52 55 0000 0000",
    rules: { required: "El telefono es obligatorio", pattern: phonePattern },
  },
];

export default function RegisterForm() {

  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset
  } = useForm<RegisterAdminFormData>({ mode: "onBlur" });

  async function onSubmit(data: RegisterAdminFormData) {

    if (data.adminPassword !== data.repeatAdminPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    try {
      const res = await createAdmin(data);
      if (!res.success) {
        toast.error(res.message);
        return;
      }

      toast.success(res.message);
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
        description="Estamos registrando tu empresa y administrador..."
        isOpen={isSubmitting || isRedirecting}
        title="Enviando Información"
      />

      <form
        aria-busy={isSubmitting}
        className="rounded-4xl bg-white/80 p-5 shadow-[0_24px_80px_rgba(46,167,162,0.14)] ring-1 ring-white/80 backdrop-blur sm:p-8 lg:p-10"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
          <section>
            <SectionHeading
              eyebrow="01"
              label="Cuenta"
              title="Datos del administrador"
            />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-1">
              {adminFields.map((field) => (
                <FormField
                  key={field.name}
                  error={errors[field.name]?.message}
                  register={register}
                  {...field}
                />
              ))}
            </div>
          </section>

          <section className="border-t border-black/8 pt-10 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            <SectionHeading
              eyebrow="02"
              label="Organizacion"
              title="Datos de la empresa"
            />
            <div className="grid gap-5">
              {companyFields.map((field) => (
                <FormField
                  key={field.name}
                  error={errors[field.name]?.message}
                  register={register}
                  {...field}
                />
              ))}
            </div>
          </section>
        </div>

        <div className="mt-10 border-t border-black/8 pt-7 sm:flex sm:items-center sm:justify-end sm:gap-6">
          <button
            className="flex h-14 w-full shrink-0 items-center justify-center rounded-2xl bg-linear-to-r from-primary to-[#35c4bd] px-7 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/30 active:translate-y-0 disabled:cursor-wait disabled:opacity-75 sm:w-auto"
            disabled={isSubmitting}
            type="submit"
          >
            Crear espacio de trabajo
          </button>
        </div>
      </form>
    </>
  );
}
