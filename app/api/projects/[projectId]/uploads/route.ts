import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedUid } from '@/app/api/helpers';
import { writeUploadsToDb } from '@/app/api/uploads/helpers';
import { FileAttachment } from '@/lib/types';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const uid = await getVerifiedUid(request);
        if (!uid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { uploads }: { uploads: Omit<FileAttachment, 'id'>[] } = await request.json();

        if (!uploads || !Array.isArray(uploads)) {
            return NextResponse.json({ error: 'Invalid uploads data' }, { status: 400 });
        }

        const savedUploads = await writeUploadsToDb(projectId, uploads);
        return NextResponse.json(savedUploads);

    } catch (error: any) {
        console.error('Error in POST /api/projects/[projectId]/uploads:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
