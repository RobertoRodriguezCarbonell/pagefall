import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/drizzle";
import { schema } from "@/db/schema";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import VerificationEmail from "@/components/emails/verification-email";

const resend = new Resend(process.env.RESEND_API_KEY!);

export const auth = betterAuth({
    emailVerification: {
        sendVerificationEmail: async ({ user, url, token }, request) => {
            const { data, error } = await resend.emails.send({
                from: 'Pagefall <onboarding@resend.dev>',
                to: [user.email],
                subject: 'Verify your email',
                react: VerificationEmail({ userName: user.name, verificationUrl: url }),
            });
        },
        sendOnSignUp: true,
    },
    emailAndPassword: {
        enabled: true,
    },
    database: drizzleAdapter(db, {
        provider: "pg",
        schema
    }),
    plugins: [nextCookies()]
});