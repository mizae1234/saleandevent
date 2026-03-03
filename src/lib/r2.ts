import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

export function isR2Configured(): boolean {
    return !!(
        process.env.R2_ACCOUNT_ID &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_BUCKET_NAME
    );
}

export function generateR2Key(filename: string): string {
    const now = new Date();
    const folder = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const uuid = crypto.randomUUID().slice(0, 8);
    // Sanitize filename: remove special chars but keep extension
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `payroll/${folder}/${uuid}-${safeName}`;
}

export async function uploadToR2(buffer: Buffer, key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    });
    await r2Client.send(command);
    return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export async function deleteFromR2(fileUrl: string): Promise<void> {
    const publicUrl = process.env.R2_PUBLIC_URL || '';
    if (!fileUrl.startsWith(publicUrl)) return;

    const key = fileUrl.replace(`${publicUrl}/`, '');
    const command = new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
    });
    await r2Client.send(command);
}
