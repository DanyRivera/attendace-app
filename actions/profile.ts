'use server'

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { ProfileFormData, UpdateProfileResult } from "@/types/profile"

export const updateProfile = async (data: ProfileFormData) : Promise<UpdateProfileResult> => {
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

    // const currentEmail = user.email?.trim().toLowerCase() ?? "";
    // const requestedEmail = data.email.trim().toLowerCase();
    // const emailChanged = requestedEmail !== currentEmail;

    const { data: profile, error: profileError } = await supabase
        .rpc("update_profile", {
            p_name: data.name.trim(),
            p_last_name: data.lastName.trim(),
            p_phone: data.phone.replace(/\D/g, ""),
            p_company_name: data.companyName.trim() || null,
            p_company_direction: data.companyDirection.trim() || null,
            p_company_phone: data.companyPhone.replace(/\D/g, "") || null,
        })
        .single();


    if (profileError) {
        // console.error("Error en update_profile:", {
        //     code: profileError.code,
        //     message: profileError.message,
        //     details: profileError.details,
        // });

        if (profileError.code === "P0001") {
            return {
                success: false,
                code: "PROFILE_VALIDATION_ERROR",
                message: profileError.message,
            };
        }

        if (profileError.code === "23505") {
            if (profileError.message.includes("users_phone_key")) {
                return {
                    success: false,
                    code: "PHONE_ALREADY_EXISTS",
                    message: "Este teléfono ya está registrado.",
                };
            }

            return {
                success: false,
                code: "DUPLICATE_VALUE",
                message: "Uno de los datos ya está registrado.",
            };
        }

        if (profileError.code === "42501") {
            return {
                success: false,
                code: "PERMISSION_DENIED",
                message: "No tienes permiso para actualizar esta información.",
            };
        }

        if (profileError.code === "PGRST202") {
            return {
                success: false,
                code: "RPC_NOT_AVAILABLE",
                message: "La actualización de perfil no está disponible.",
            };
        }

        return {
            success: false,
            code: "PROFILE_UPDATE_FAILED",
            message: "No se pudo actualizar el perfil. Intenta nuevamente.",
        };
    }

    if (!profile) {
        return {
            success: false,
            code: "EMPTY_RESPONSE",
            message: "No se recibió información del perfil actualizado.",
        };
    }

    // const { error: metadataError } = await supabase.auth.updateUser({
    //     data: {
    //         ...user.user_metadata,
    //         name: data.name.trim(),
    //         lastName: data.lastName.trim(),
    //         phone: data.phone.replace(/\D/g, ""),
    //     },
    // });
    // if (metadataError) {
    //     return {
    //         success: true,
    //         warning: "El perfil fue actualizado, pero no se pudo sincronizar la información de la cuenta.",
    //     };
    // }

    // if (emailChanged) {
    //     const { error: emailError } = await supabase.auth.updateUser({
    //         email: requestedEmail,
    //     });

    //     revalidatePath("/profile");

    //     if (emailError) {
    //         return {
    //             success: true,
    //             emailChangeRequested: false,
    //             warning: "El perfil fue actualizado, pero no se pudo solicitar el cambio de correo.",
    //         };
    //     }

    //     return {
    //         success: true,
    //         emailChangeRequested: true,
    //         message: "Perfil actualizado. Revisa tu correo actual y el nuevo para confirmar el cambio.",
    //     };
    // }

    revalidatePath("/profile");

    return {
        success: true,
        message: "Perfil actualizado correctamente.",
    };

}