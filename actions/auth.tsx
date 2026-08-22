'use server'

import { createClient } from "@/lib/supabase/server";
import type { LoginFormData } from "@/types/login";
import { redirect } from "next/navigation";

export const login = async (data: LoginFormData) => {

    const { password } = data;

    const email = data.email.trim().toLowerCase()

    const supabase = await createClient();
    const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error?.code == 'invalid_credentials') {
        return {
            success: false,
            message: 'El correo o la contraseña son incorrectos'
        }
    }

    if (error?.code === "too_many_requests") {
        return {
            success: false,
            message: 'Demasiados intentos. Intenta de nuevo más tarde'
        }
    }

    const role = authData.user?.user_metadata.role;

    return {
        success: true,
        role
    }
}

export const getUser = async () => {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return null;
    }

    const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("id, name, lastName, phone, isAdmin, company")
        .eq("auth_user_id", user.id)
        .single();

    if (profileError || !profile) {
        return null;
    }

    const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id, name, code, phone, direction")
        .eq("id", profile.company)
        .single();

    if (companyError || !company) {
        return {
            authId: user.id,
            email: user.email,
            profileId: profile.id,
            name: profile.name,
            lastName: profile.lastName,
            isAdmin: profile.isAdmin,
            phone: profile.phone,
            company: null,
        };
    }

    return {
        authId: user.id,
        email: user.email,
        profileId: profile.id,
        name: profile.name,
        lastName: profile.lastName,
        isAdmin: profile.isAdmin,
        phone: profile.phone,
        company
    };
}

export const logout = async () => {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
        throw new Error("No se pudo cerrar la sesion");
    }

    redirect("/login");
}