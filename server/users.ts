"use server";
import { auth } from "@/lib/auth";

export const signInUser = async (email: string, password: string) => {
    try {
        await auth.api.signInEmail({
            body: {
                email,
                password
            },
        });

        return { success: true, message: "Sesión iniciada con éxito" };
    } catch (error) {
        const e = error as Error;
        return { success: false, message: e.message || "Error al iniciar sesión" };
    }
};

export const signUpUser = async (email: string, password: string, name: string) => {
    try {
        await auth.api.signUpEmail({
            body: {
                email,
                password,
                name,
            },
        });

        return { success: true, message: "Usuario registrado con éxito" };
    } catch (error) {
        const e = error as Error;
        return { success: false, message: e.message || "Error al registrar usuario" };
    }
};