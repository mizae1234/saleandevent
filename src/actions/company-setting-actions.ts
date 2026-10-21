'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { uploadToR2, isR2Configured } from '@/lib/r2';

export interface CompanySettingData {
    id: string;
    name: string;
    nameEn: string | null;
    taxId: string | null;
    branchName: string | null;
    branchCode: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    logoUrl: string | null;
    bankName: string | null;
    bankAccountNo: string | null;
    bankAccountName: string | null;
    footerNote: string | null;
    updatedAt: Date;
}

const DEFAULT_COMPANY: Omit<CompanySettingData, 'id' | 'updatedAt'> = {
    name: 'บริษัท สวยไม่ไหว 2020 จำกัด',
    nameEn: '',
    taxId: '0105563046582',
    branchName: 'สำนักงานใหญ่',
    branchCode: '00000',
    address: '5/204 ถนนเทศบาลสงเคราะห์ แขวงลาดยาว เขตจตุจักร จังหวัดกรุงเทพมหานคร',
    phone: '',
    email: '',
    website: '',
    logoUrl: '',
    bankName: '',
    bankAccountNo: '',
    bankAccountName: '',
    footerNote: '',
};

// ============ GET COMPANY SETTING ============
export async function getCompanySetting(): Promise<CompanySettingData> {
    try {
        let setting = await db.companySetting.findFirst({
            orderBy: { createdAt: 'asc' },
        });

        if (!setting) {
            setting = await db.companySetting.create({
                data: {
                    ...DEFAULT_COMPANY,
                },
            });
        }

        return {
            id: setting.id,
            name: setting.name,
            nameEn: setting.nameEn,
            taxId: setting.taxId,
            branchName: setting.branchName,
            branchCode: setting.branchCode,
            address: setting.address,
            phone: setting.phone,
            email: setting.email,
            website: setting.website,
            logoUrl: setting.logoUrl,
            bankName: setting.bankName,
            bankAccountNo: setting.bankAccountNo,
            bankAccountName: setting.bankAccountName,
            footerNote: setting.footerNote,
            updatedAt: setting.updatedAt,
        };
    } catch (error) {
        console.error('getCompanySetting error:', error);
        // Fallback default in case of DB read error
        return {
            id: '',
            ...DEFAULT_COMPANY,
            updatedAt: new Date(),
        };
    }
}

// ============ UPDATE COMPANY SETTING ============
export async function updateCompanySetting(formData: FormData) {
    try {
        const session = await getSession();
        const id = (formData.get('id') as string)?.trim();
        const name = (formData.get('name') as string)?.trim();

        if (!name) {
            return { error: 'กรุณาระบุชื่อร้านหรือชื่อบริษัท' };
        }

        const dataToSave = {
            name,
            nameEn: (formData.get('nameEn') as string)?.trim() || null,
            taxId: (formData.get('taxId') as string)?.trim() || null,
            branchName: (formData.get('branchName') as string)?.trim() || 'สำนักงานใหญ่',
            branchCode: (formData.get('branchCode') as string)?.trim() || '00000',
            address: (formData.get('address') as string)?.trim() || null,
            phone: (formData.get('phone') as string)?.trim() || null,
            email: (formData.get('email') as string)?.trim() || null,
            website: (formData.get('website') as string)?.trim() || null,
            logoUrl: (formData.get('logoUrl') as string)?.trim() || null,
            bankName: (formData.get('bankName') as string)?.trim() || null,
            bankAccountNo: (formData.get('bankAccountNo') as string)?.trim() || null,
            bankAccountName: (formData.get('bankAccountName') as string)?.trim() || null,
            footerNote: (formData.get('footerNote') as string)?.trim() || null,
            updatedBy: session?.staffId || null,
        };

        let result;
        if (id) {
            result = await db.companySetting.update({
                where: { id },
                data: dataToSave,
            });
        } else {
            const existing = await db.companySetting.findFirst({
                orderBy: { createdAt: 'asc' },
            });
            if (existing) {
                result = await db.companySetting.update({
                    where: { id: existing.id },
                    data: dataToSave,
                });
            } else {
                result = await db.companySetting.create({
                    data: dataToSave,
                });
            }
        }

        revalidatePath('/admin/company');
        revalidatePath('/finance/invoices');
        revalidatePath('/channels');

        return { success: true, data: result };
    } catch (error: any) {
        console.error('updateCompanySetting error:', error);
        return { error: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
    }
}

// ============ UPLOAD COMPANY LOGO ============
export async function uploadCompanyLogo(formData: FormData) {
    try {
        const file = formData.get('file') as File | null;
        if (!file || file.size === 0) {
            return { error: 'กรุณาเลือกไฟล์รูปภาพ' };
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            return { error: 'รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WebP, SVG)' };
        }

        // Max 5MB
        if (file.size > 5 * 1024 * 1024) {
            return { error: 'ขนาดไฟล์ต้องไม่เกิน 5MB' };
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        if (isR2Configured()) {
            const ext = file.name.split('.').pop() || 'png';
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const key = `company/logo-${Date.now()}-${safeName}`;
            const url = await uploadToR2(buffer, key, file.type);
            return { success: true, url };
        } else {
            // Data URL fallback if R2 is not configured
            const base64 = buffer.toString('base64');
            const dataUrl = `data:${file.type};base64,${base64}`;
            return { success: true, url: dataUrl };
        }
    } catch (error: any) {
        console.error('uploadCompanyLogo error:', error);
        return { error: error.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ' };
    }
}
