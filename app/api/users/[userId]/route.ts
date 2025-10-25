import { NextRequest, NextResponse } from "next/server";

import { getVerifiedUid } from "../../helpers";
import { getUserById } from "../helpers";

// return user data from user id
export async function GET(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
    const uid = await getVerifiedUid(req);
    if (!uid) return NextResponse.json({ error: "No user ID provided" }, { status: 400 });

    const { userId } = await context.params;

    try {
        const user = await getUserById(userId);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Return only basic user info
        const basicUser = {
            id: user.id,
            email: user.email,
            displayName: user.displayName
        };

        return NextResponse.json(basicUser);
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
