import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedProjectAccess } from '@/app/api/helpers';
import { writeUploadsToDb } from '@/app/api/uploads/helpers';
import { FileAttachment } from "@/lib/types/uploads";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        await getVerifiedProjectAccess(request, projectId);

        const { uploads }: { uploads: Omit<FileAttachment, 'id'>[] } = await request.json();

        if (!uploads || !Array.isArray(uploads)) {
            return NextResponse.json({ error: 'Invalid uploads data' }, { status: 400 });
        }

        const savedUploads = await writeUploadsToDb(projectId, uploads);
        return NextResponse.json(savedUploads);

    } catch (error: unknown) {
        console.error('Error in POST /api/projects/[projectId]/uploads:', error);
        return NextResponse.json({ error: (error as Error).message || 'Internal Server Error' }, { status: 500 });
    }
}
