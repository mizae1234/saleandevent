import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, isR2Configured } from '@/lib/r2';
import { getSession } from '@/lib/auth';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const actionType = (formData.get('type') as string) || 'checkin';

        if (!file || file.size === 0) {
            return NextResponse.json({ error: 'กรุณาถ่ายภาพก่อนยืนยัน' }, { status: 400 });
        }

        if (file.type && !ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'รองรับเฉพาะไฟล์รูปภาพเท่านั้น' }, { status: 400 });
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'ขนาดไฟล์รูปภาพต้องไม่เกิน 10MB' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const contentType = file.type || 'image/jpeg';

        if (isR2Configured()) {
            const now = new Date();
            const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const key = `attendance/${yearMonth}/${session.staffId}-${actionType}-${Date.now()}.jpg`;
            const url = await uploadToR2(buffer, key, contentType);
            return NextResponse.json({ success: true, url });
        } else {
            const base64 = buffer.toString('base64');
            const dataUrl = `data:${contentType};base64,${base64}`;
            return NextResponse.json({ success: true, url: dataUrl });
        }
    } catch (error) {
        console.error('Attendance photo upload error:', error);
        return NextResponse.json({ error: 'อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
    }
}

