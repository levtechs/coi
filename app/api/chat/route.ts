import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { Message } from "@/lib/types/chat";
import { getVerifiedProjectAccess } from "../helpers";


export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const projectId = url.searchParams.get("projectId");
        if (!projectId) return NextResponse.json({ error: "projectId query parameter required" }, { status: 400 });

        const uid = await getVerifiedProjectAccess(req, projectId);

        const chatDocRef = adminDb.collection("projects").doc(projectId).collection("chats").doc(uid);
        const chatSnap = await chatDocRef.get();

        if (!chatSnap.exists) return NextResponse.json({ messages: [] }); // No messages yet

        const data = chatSnap.data();
        const messages: Message[] = data?.messages || [];

        return NextResponse.json({ messages });
    } catch (err) {
        console.error("Error fetching chat history:", err);
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
