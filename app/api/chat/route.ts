import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Message } from "@/lib/types";
import { getVerifiedUid } from "../helpers";


export async function GET(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });
    console.log(JSON.stringify(req))
    try {
        const url = new URL(req.url);
        const projectId = url.searchParams.get("projectId");
        if (!projectId) return NextResponse.json({ error: "projectId query parameter required" }, { status: 400 });

        const chatDocRef = doc(db, "projects", projectId, "chats", uid);
        const chatSnap = await getDoc(chatDocRef);

        console.log("UID:", uid);
        console.log("Expected path:", `projects/${projectId}/chats/${uid}`);

        console.log(chatSnap.exists());
        if (!chatSnap.exists()) return NextResponse.json({ messages: [] }); // No messages yet

        const data = chatSnap.data();
        const messages: Message[] = data.messages || [];

        return NextResponse.json({ messages });
    } catch (err) {
        console.error("Error fetching chat history:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}


/*
 * ========================================================
 * ========================================================
 * ============ EVERYTHING BELOW IS DEPRICATED ============
 * ========================================================
 * ========================================================
 */


/*

export async function POST(req: NextRequest) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    try {
        const body = await req.json();
        const { message, messageHistory, projectId } = body as { message: , messageHistory: Message[], projectId: string };
    
        const previousContent = await getPreviousContent(projectId);

        const chatResponse = await getChatResponse(message, messageHistory, previousContent) || {responseMessage: "Sorry, I couldn't generate a response.", hasNewInfo: false};
        const responseMessage = chatResponse.responseMessage;
        writeChatPairToDb(message, messageresponseMessage, projectId, uid);

        if (chatResponse.hasNewInfo) {
            const newContent: JSON = await getUpdatedContent(previousContent, message, responseMessage);
            writeNewContentToDb(newContent, projectId);
            const allCards: Card[] = await extractWriteCards(projectId, newContent) || [];

            console.log("New content generated and stored.");
            return NextResponse.json({ response: responseMessage , newContent, allCards}); 
        }
        else {
            console.log("No new content generated.");
            return NextResponse.json({ response: responseMessage });
        }

        
    } catch (err) {
        console.error("Error in /api/chat:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

*/