import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { uploadToR2, generateR2Key, isR2Configured } from '@/lib/r2';
import { getSession } from '@/lib/auth';

const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB per file

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!isR2Configured()) {
            return NextResponse.json({ error: 'R2 storage not configured' }, { status: 500 });
        }

        const formData = await request.formData();
        const channelId = formData.get('channelId') as string;
        const staffId = formData.get('staffId') as string;

        if (!channelId || !staffId) {
            return NextResponse.json({ error: 'Missing channelId or staffId' }, { status: 400 });
        }

        // Find channelStaff record
        const channelStaff = await db.channelStaff.findFirst({
            where: { channelId, staffId },
        });

        if (!channelStaff) {
            return NextResponse.json({ error: 'Staff not assigned to this channel' }, { status: 404 });
        }

        // Get all files from form data
        const files = formData.getAll('files') as File[];
        if (files.length === 0) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 });
        }

        const results = [];

        for (const file of files) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                continue; // Skip unsupported types silently
            }
            if (file.size > MAX_SIZE) {
                continue; // Skip oversized files
            }

            const buffer = Buffer.from(await file.arrayBuffer());
            const key = generateR2Key(file.name);
            const url = await uploadToR2(buffer, key, file.type);

            const attachment = await db.payrollAttachment.create({
                data: {
                    channelStaffId: channelStaff.id,
                    fileName: file.name,
                    fileUrl: url,
                    fileType: file.type,
                    fileSize: file.size,
                    createdBy: session.staffId,
                },
            });

            results.push({
                id: attachment.id,
                fileName: attachment.fileName,
                fileUrl: attachment.fileUrl,
                fileType: attachment.fileType,
                fileSize: attachment.fileSize,
            });
        }

        return NextResponse.json({ success: true, attachments: results });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
