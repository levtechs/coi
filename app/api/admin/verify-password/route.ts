import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { password } = await req.json();
        if (password === process.env.ADMIN_PASSWORD) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ success: false }, { status: 401 });
        }
    } catch (err) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}