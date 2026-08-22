"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  GetPendingPaymentDaysResult,
  PendingPaymentDay,
  RegisteredPaymentData,
  RegisterWorkerPaymentInput,
  RegisterWorkerPaymentResult,
} from "@/types/payments";

export async function getCompanyWorkerPaymentDays(
  workerId: string,
): Promise<GetPendingPaymentDaysResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_worker_pending_payments",
    {
      p_worker_id: workerId,
    },
  );

  if (error) {
    if (error.code === "P0001") {
      return {
        success: false,
        code: "PENDING_PAYMENT_REJECTED",
        message: error.message,
      };
    }

    if (error.code === "42501") {
      return {
        success: false,
        code: "PERMISSION_DENIED",
        message: "No tienes permiso para consultar estos pagos pendientes.",
      };
    }

    if (error.code === "PGRST202") {
      return {
        success: false,
        code: "RPC_NOT_AVAILABLE",
        message: "La consulta de pagos pendientes no está disponible.",
      };
    }

    if (error.code === "22P02") {
      return {
        success: false,
        code: "INVALID_WORKER_ID",
        message: "El identificador del colaborador no es válido.",
      };
    }

    return {
      success: false,
      code: "PENDING_PAYMENT_QUERY_FAILED",
      message: "No se pudieron consultar las jornadas pendientes.",
    };
  }

  return {
    success: true,
    data: (data ?? []) as PendingPaymentDay[],
  };
}

export async function registerCompanyWorkerPayment(
  input: RegisterWorkerPaymentInput,
): Promise<RegisterWorkerPaymentResult> {
  if (!input.worker_id) {
    return {
      success: false,
      code: "WORKER_REQUIRED",
      message: "Selecciona un colaborador.",
    };
  }

  if (!Array.isArray(input.day_ids) || input.day_ids.length === 0) {
    return {
      success: false,
      code: "PAYMENT_DAYS_REQUIRED",
      message: "Selecciona al menos una jornada.",
    };
  }

  if (input.day_ids.some((dayId) => !dayId)) {
    return {
      success: false,
      code: "INVALID_PAYMENT_DAYS",
      message: "La selección contiene jornadas inválidas.",
    };
  }

  const uniqueDayIds = [...new Set(input.day_ids)];

  if (uniqueDayIds.length !== input.day_ids.length) {
    return {
      success: false,
      code: "DUPLICATE_PAYMENT_DAYS",
      message: "La selección contiene jornadas duplicadas.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("register_worker_payment", {
      p_worker_id: input.worker_id,
      p_day_ids: uniqueDayIds,
    })
    .single();

  if (error) {
    if (error.code === "P0001") {
      return {
        success: false,
        code: "PAYMENT_REJECTED",
        message: error.message,
      };
    }

    if (error.code === "23505") {
      return {
        success: false,
        code: "PAYMENT_ALREADY_REGISTERED",
        message: "Una o más jornadas ya fueron incluidas en otro pago.",
      };
    }

    if (error.code === "42501") {
      return {
        success: false,
        code: "PERMISSION_DENIED",
        message: "No tienes permiso para registrar este pago.",
      };
    }

    if (error.code === "22P02") {
      return {
        success: false,
        code: "INVALID_IDENTIFIER",
        message:
          "El colaborador o alguna jornada tiene un identificador inválido.",
      };
    }

    if (error.code === "PGRST202") {
      return {
        success: false,
        code: "RPC_NOT_AVAILABLE",
        message: "El registro de pagos no está disponible.",
      };
    }

    if (error.code === "PGRST116") {
      return {
        success: false,
        code: "EMPTY_RESPONSE",
        message: "No se recibió información del pago registrado.",
      };
    }

    return {
      success: false,
      code: "PAYMENT_REGISTRATION_FAILED",
      message: "No se pudo registrar el pago. Intenta nuevamente.",
    };
  }

  if (!data) {
    return {
      success: false,
      code: "EMPTY_RESPONSE",
      message: "No se recibió información del pago registrado.",
    };
  }

  const payment = data as RegisteredPaymentData;

  revalidatePath("/pay");
  revalidatePath("/dashboard");
  revalidatePath("/history");

  return {
    success: true,
    data: payment,
    message:
      payment.paid_days === 1
        ? "Pago registrado correctamente para 1 jornada."
        : `Pago registrado correctamente para ${payment.paid_days} jornadas.`,
  };
}
