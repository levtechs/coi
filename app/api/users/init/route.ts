import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    if (!idToken) return NextResponse.json({ error: "No token provided" }, { status: 401 });

    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        const uid = decoded.uid;
        
        const body = await req.json();
        const { email, displayName } = body;

        const userRef = adminDb.collection("users").doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            await userRef.set({
                email: email || decoded.email || "",
                displayName: displayName || decoded.name || "",
                projectIds: [],
                createdAt: new Date().toISOString(),
            });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Error initializing user:", err);
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
