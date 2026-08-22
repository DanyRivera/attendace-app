'use server'

import { createClient } from "@/lib/supabase/server";
import type {
    GetWorkerTimeResult,
    RegisterTimeData,
    RegisterTimeResult,
    TodayAttendanceData,
} from "@/types/time";
import type {
    GetWorkerHistoryResult,
    HistoryDayData,
} from "@/types/history";
import type {
    CompanyWorkerData,
    GetCompanyWorkersResult,
    UpdateSalaryResult,
    WorkerUpdateSalaryData,
} from "@/types/workers";
import { revalidatePath } from "next/cache";

export const registerTime = async (): Promise<RegisterTimeResult> => {

    const supabase = await createClient();

    const { data, error } = await supabase.rpc('register_time').single();

    if (error) {
        return {
            success: false,
            code: error.code,
            message: error.message,
        };
    }

    if (!data) {
        return {
            success: false,
            code: "EMPTY_RESPONSE",
            message: "No se recibio informacion del registro",
        };
    }

    const result = data as RegisterTimeData;

    return {
        success: true,
        action: result.action,
    };
}

export const getWorkerTime = async (): Promise<GetWorkerTimeResult> => {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_today_attendance').single();

    if (error) {
        return {
            success: false,
            code: error.code,
            message: error.message,
        };
    }

    if (!data) {
        return {
            success: false,
            code: "EMPTY_RESPONSE",
            message: "No se recibio la asistencia del dia",
        };
    }

    return {
        success: true,
        data: data as TodayAttendanceData
    }

}

export const getWorkerHistory = async (): Promise<GetWorkerHistoryResult> => {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("days")
        .select(`
            id,
            work_date,
            is_paid,
            paid_at,
            periods (
                id,
                started_at,
                ended_at
            )
        `)
        .order("work_date", { ascending: false });
    // .range()


    if (error) {
        return {
            success: false,
            code: error.code,
            message: error.message,
        };
    }

    //Ordena los periodos
    const history = ((data ?? []) as HistoryDayData[]).map((day) => ({
        ...day,
        periods: [...day.periods].sort(
            (first, second) =>
                new Date(first.started_at).getTime() -
                new Date(second.started_at).getTime(),
        ),
    }));

    return {
        success: true,
        data: history,
    }
}

export const getWorkers = async (): Promise<GetCompanyWorkersResult> => {

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();


    if (authError || !user) {
        return {
            success: false,
            code: "UNAUTHENTICATED",
            message: "Tu sesión no es válida. Inicia sesión nuevamente.",
        };
    }

    const { data, error } = await supabase.rpc("get_company_workers");

    if (error) {
        if (error.code === "P0001") {
            return {
                success: false,
                code: "WORKERS_ACCESS_ERROR",
                message: error.message,
            };
        }

        if (error.code === "42501") {
            return {
                success: false,
                code: "PERMISSION_DENIED",
                message: "No tienes permiso para consultar colaboradores.",
            };
        }

        if (error.code === "PGRST202") {
            return {
                success: false,
                code: "RPC_NOT_AVAILABLE",
                message: "La consulta de colaboradores no está disponible.",
            };
        }


    }

    return {
        success: true,
        data: (data ?? []) as CompanyWorkerData[],
    };

}

export const updateWorkerSalary = async (data: WorkerUpdateSalaryData): Promise<UpdateSalaryResult> => {
    const supabase = await createClient();

    const { data: workerData, error } = await supabase
        .rpc("update_worker_salary", {
            p_worker_id: data.worker_id,
            p_salary: data.salary,
        })
        .single();


    if (error) {
        if (error.code === "P0001") {
            return {
                success: false,
                code: "SALARY_UPDATE_REJECTED",
                message: error.message,
            };
        }

        if (error.code === "42501") {
            return {
                success: false,
                code: "PERMISSION_DENIED",
                message: "No tienes permiso para actualizar este sueldo.",
            };
        }

        if (error.code === "PGRST202") {
            return {
                success: false,
                code: "RPC_NOT_AVAILABLE",
                message: "La actualización de sueldo no está disponible.",
            };
        }

        return {
            success: false,
            code: "SALARY_UPDATE_FAILED",
            message: "No se pudo actualizar el sueldo. Intenta nuevamente.",
        };
    }

    if (!workerData) {
        return {
            success: false,
            code: "EMPTY_RESPONSE",
            message: "No se recibió información del sueldo actualizado.",
        };
    }

    revalidatePath("/workers");

    return {
        success: true,
        data: workerData as WorkerUpdateSalaryData,
        message: "Sueldo actualizado correctamente.",
    };
}

export const getCompanyWorkerHistory = async (workerId: string): Promise<GetWorkerHistoryResult> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
        "get_company_worker_history",
        {
            p_worker_id: workerId,
        },
    );

    if (error) {
        // Errores de negocio generados por la RPC.
        if (error.code === "P0001") {
            return {
                success: false,
                code: "WORKER_HISTORY_REJECTED",
                message: error.message,
            };
        }

        if (error.code === "42501") {
            return {
                success: false,
                code: "PERMISSION_DENIED",
                message:
                    "No tienes permiso para consultar este historial.",
            };
        }

        if (error.code === "PGRST202") {
            return {
                success: false,
                code: "RPC_NOT_AVAILABLE",
                message:
                    "La consulta del historial no está disponible.",
            };
        }

        if (error.code === "22P02") {
            return {
                success: false,
                code: "INVALID_WORKER_ID",
                message:
                    "El identificador del colaborador no es válido.",
            };
        }

        return {
            success: false,
            code: "WORKER_HISTORY_QUERY_FAILED",
            message:
                "No se pudo consultar el historial del colaborador.",
        };
    }

    return {
        success: true,
        data: (data ?? []) as HistoryDayData[],
    };

}


