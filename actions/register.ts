'use server'

import type { RegisterAdminFormData } from '@/types/register-admin';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { RegisterWorkerFormData } from '@/types/register-worker';

export async function createAdmin(data: RegisterAdminFormData) {

    const { adminName, adminLastName, adminEmail, adminPassword, repeatAdminPassword, companyName, companyAddress } = data;

    const adminPhone = data.adminPhone.trim().replace(/\D/g, "");;
    const companyPhone = data.companyPhone.trim().replace(/\D/g, "");


    if (!adminName || adminName.length < 2) {
        return {
            success: false,
            message: "El nombre es obligatorio y debe teber al menos 2 caracteres"
        }
    }

    if (!adminLastName || adminLastName.length < 2) {
        return {
            success: false,
            message: "El apellido es obligatorio y debe teber al menos 2 caracteres"
        }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
        return {
            success: false,
            message: "El correo no es válido"
        }
    }

    if (!/^\d{10}$/.test(adminPhone)) {
        return {
            success: false,
            message: "El teléfono del administrador debe tener 10 dígitos"
        };
    }

    if (!adminPassword || !repeatAdminPassword) {
        return {
            success: false,
            message: "La contraseña es obligatoria",
        };
    }

    if (adminPassword.length < 4) {
        return {
            success: false,
            message: "La contraseña debe tener al menos 4 caracteres",
        };
    }

    if (adminPassword !== repeatAdminPassword) {
        return {
            success: false,
            message: "Las contraseñas no coinciden",
        };
    }

    if (!companyName || companyName.length < 2) {
        return {
            success: false,
            message: "El nombre de la empresa es obligatoria y debe teber al menos 2 caracteres"
        }
    }

    if (!companyAddress || companyAddress.length < 5) {
        return {
            success: false,
            message: "La dirección es obligatorio y debe teber al menos 5 caracteres"
        }
    }

    if (!/^\d{10}$/.test(companyPhone)) {
        return {
            success: false,
            message: "El teléfono de la empresa debe tener 10 dígitos"
        };
    }

    const supabase = createSupabaseAdminClient();

    const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
            email: adminEmail.trim().toLowerCase(),
            password: adminPassword,
            email_confirm: true,
            user_metadata: {
                name: adminName.trim(),
                lastName: adminLastName.trim(),
                phone: adminPhone,
                role: "admin",
            },
        });

    if (authError) {
        if (
            authError.message.includes("already been registered") ||
            authError.message.includes("already registered")
        ) {
            return {
                success: false,
                message: "Este correo ya esta registrado",
            };
        }

        return {
            success: false,
            message: authError.message,
        };
    }

    const authUserId = authData.user.id;

    //Insert the user adimn and the company at the same time with a function of SQL
    const { data: result, error } = await supabase.rpc(
        "register_company_admin",
        {
            p_auth_user_id: authUserId,
            p_company_name: companyName.trim(),
            p_company_direction: companyAddress.trim(),
            p_company_phone: companyPhone,
            p_admin_name: adminName.trim(),
            p_admin_last_name: adminLastName.trim(),
            p_admin_email: adminEmail.trim().toLowerCase(),
            p_admin_phone: adminPhone,
        },
    ).single();

    if (error?.code === "23505") {

        if (error.message.includes("users_email_key")) {
            return {
                success: false,
                message: "Este correo ya esta registrado",
            };
        }

        if (error.message.includes("users_phone_key")) {
            return {
                success: false,
                message: "Este telefono ya esta registrado",
            };
        }
    }

    if (error) {
        await supabase.auth.admin.deleteUser(authUserId);
        return {
            success: false,
            message: error.message,
        };
    }

    return {
        success: true,
        message: 'Usuario y Empresa registrados con éxito, inicia sesión.'
    }

}

export async function createWorker(data: RegisterWorkerFormData) {

    const { workerName, workerLastName, workerEmail, workerPassword, repeatWorkerPassword, companyCode } = data;
    const workerPhone = data.workerPhone.trim().replace(/\D/g, "");;


    if (!workerName || workerName.length < 2) {
        return {
            success: false,
            message: "El nombre es obligatorio y debe teber al menos 2 caracteres"
        }
    }

    if (!workerLastName || workerLastName.length < 2) {
        return {
            success: false,
            message: "El apellido es obligatorio y debe teber al menos 2 caracteres"
        }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workerEmail)) {
        return {
            success: false,
            message: "El correo no es válido"
        }
    }

    if (!/^\d{10}$/.test(workerPhone)) {
        return {
            success: false,
            message: "El teléfono del administrador debe tener 10 dígitos"
        };
    }

    if (!workerPassword || !repeatWorkerPassword) {
        return {
            success: false,
            message: "La contraseña es obligatoria",
        };
    }

    if (workerPassword.length < 4) {
        return {
            success: false,
            message: "La contraseña debe tener al menos 4 caracteres",
        };
    }

    if (workerPassword !== repeatWorkerPassword) {
        return {
            success: false,
            message: "Las contraseñas no coinciden",
        };
    }



    const supabase = createSupabaseAdminClient();

    const { data: company, error: errorCompany } = await supabase
        .from("companies")
        .select("id, name, code")
        .eq("code", companyCode.trim().toUpperCase())
        .single();



    if (errorCompany?.code === 'PGRST116') {
        return {
            success: false,
            message: "La empresa no existe",
        };
    }

    if (errorCompany) {
        return {
            success: false,
            message: errorCompany.message,
        };
    }

    const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
            email: workerEmail.trim().toLowerCase(),
            password: workerPassword,
            email_confirm: true,
            user_metadata: {
                name: workerName.trim(),
                lastName: workerLastName.trim(),
                phone: workerPhone,
                role: "worker",
            },
        });

    if (authError) {
        if (
            authError.message.includes("already been registered") ||
            authError.message.includes("already registered")
        ) {
            return {
                success: false,
                message: "Este correo ya esta registrado",
            };
        }

        return {
            success: false,
            message: authError.message,
        };
    }

    const authUserId = authData.user.id;
    const companyId = company?.id;

    const { error } = await supabase
        .from('users')
        .insert({
            name: workerName,
            lastName: workerLastName,
            email: workerEmail,
            phone: workerPhone,
            isAdmin: false,
            salary: 0,
            company: companyId,
            auth_user_id: authUserId
        })

    if (error?.code === "23505") {
        await supabase.auth.admin.deleteUser(authUserId);
        if (error.message.includes("users_email_key")) {
            return {
                success: false,
                message: "Este correo ya esta registrado",
            };
        }

        if (error.message.includes("users_phone_key")) {
            return {
                success: false,
                message: "Este telefono ya esta registrado",
            };
        }
    }

    if (error) {
        await supabase.auth.admin.deleteUser(authUserId);
        return {
            success: false,
            message: error.message,
        };
    }

    return {
        success: true,
        message: 'Colaborador creado con exito, inicia sesión.'
    }
}


