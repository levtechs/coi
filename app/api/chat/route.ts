import { writeChatPairToDb, writeNewContentToDb, getChatResponse, getUpdatedContent } from "./helpers";

import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Message } from "@/lib/types";
import { getVerifiedUid } from "../helpers";

export async function POST(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    try {
        const body = await req.json();
        const { message, messageHistory, projectId } = body as { message: string, messageHistory: Message[], projectId: string };
        
        const result = await getChatResponse(message, messageHistory) || "";

        writeChatPairToDb(message, result, projectId, uid);
        const newContent: string = await getUpdatedContent(message, result);
        await writeNewContentToDb(newContent, projectId);

        return NextResponse.json({ response: result || "" , newContent}); 
        
    } catch (err) {
        console.error("Error in /api/chat:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    try {
        const url = new URL(req.url);
        const projectId = url.searchParams.get("projectId");
        if (!projectId) return NextResponse.json({ error: "projectId query parameter required" }, { status: 400 });

        const chatDocRef = doc(db, "projects", projectId, "chats", uid);
        const chatSnap = await getDoc(chatDocRef);

        if (!chatSnap.exists()) return NextResponse.json({ messages: [] }); // No messages yet

        const data = chatSnap.data();
        const messages: Message[] = data.messages || [];

        return NextResponse.json({ messages });
    } catch (err) {
        console.error("Error fetching chat history:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}