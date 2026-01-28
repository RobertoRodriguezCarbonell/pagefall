import { auth } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const publicId = searchParams.get("id");

    if (!publicId) {
        return new NextResponse("Missing id parameter", { status: 400 });
    }

    // 1. Verify Authentication
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        // 2. Generate Signed URL for Cloudinary
        // "private" resources require signature
        const url = cloudinary.url(publicId, {
            type: "private",
            sign_url: true,
            secure: true,
            expires_at: Math.floor(Date.now() / 1000) + 3600 // Link valid for 1 hour
        });

        // 3. Redirect to the signed URL
        return NextResponse.redirect(url);
    } catch (error) {
        console.error("Error generating signed url:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
