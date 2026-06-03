import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { NextResponse } from "next/server";

// Helper: Parse date from different possible formats
function parseExcelDate(val: any): Date | null {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'number') {
        // Excel serial number
        return new Date(Math.round((val - 25569) * 86400 * 1000));
    }
    const str = String(val).trim();
    if (!str) return null;

    // Check YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return new Date(str);
    }

    // Check DD/MM/YYYY or DD-MM-YYYY
    const parts = str.replace(/\//g, '-').split('-');
    if (parts.length === 3) {
        const [d, m, y] = parts.map(Number);
        if (d && m && y) {
            // Convert Buddhist year to Christian year if > 2400
            const year = y > 2400 ? y - 543 : y;
            return new Date(year, m - 1, d);
        }
    }
    return null;
}

function dobToPassword(dob: Date): string {
    const d = dob.getDate().toString().padStart(2, '0');
    const m = (dob.getMonth() + 1).toString().padStart(2, '0');
    const y = dob.getFullYear().toString(); // Use Christian calendar (ค.ศ.) as in auth-actions.ts
    return `${d}${m}${y}`;
}

const DEFAULT_DOB = new Date(2026, 0, 1);

const roleMap: Record<string, string> = {
    "admin": "ADMIN",
    "ผู้ดูแลระบบ": "ADMIN",
    "manager": "MANAGER",
    "ผู้จัดการ": "MANAGER",
    "finance": "FINANCE",
    "บัญชี": "FINANCE",
    "hr": "HR",
    "บุคคล": "HR",
    "warehouse": "WAREHOUSE",
    "คลังสินค้า": "WAREHOUSE",
    "pc": "PC",
    "พนักงานขาย": "PC",
    "staff": "STAFF",
    "พนักงานทั่วไป": "STAFF",
};

const typeMap: Record<string, string> = {
    "fulltime": "fulltime",
    "ประจำ": "fulltime",
    "parttime": "parttime",
    "พาร์ทไทม์": "parttime",
    "temporary": "temporary",
    "ชั่วคราว": "temporary",
};

const paymentMap: Record<string, string> = {
    "daily": "daily",
    "รายวัน": "daily",
    "monthly": "monthly",
    "รายเดือน": "monthly",
    "commission": "commission",
    "คอมมิชชั่น": "commission",
};

export async function POST(req: Request) {
    try {
        const body = await req.json();
        if (!Array.isArray(body)) {
            return NextResponse.json({ error: "ข้อมูลต้องเป็นอาเรย์" }, { status: 400 });
        }

        let createdCount = 0;
        const skippedNames: string[] = [];
        const errors: string[] = [];

        // 1. Get starting staff code
        let currentCodeNumber = 0;
        const lastStaff = await db.staff.findFirst({
            where: { code: { not: null, startsWith: 'S' } },
            orderBy: { code: 'desc' },
            select: { code: true }
        });
        if (lastStaff?.code) {
            currentCodeNumber = parseInt(lastStaff.code.replace('S', ''), 10);
        }

        // 2. Loop through and process each row
        for (const row of body) {
            const rawName = row.name || row["ชื่อ-สกุล"] || row["ชื่อ"] || row["ชื่อ-นามสกุล"];
            const name = rawName ? String(rawName).trim() : "";

            if (!name) {
                errors.push("พบข้อมูลพนักงานที่ไม่มีชื่อ");
                continue;
            }

            const rawPhone = row.phone || row["เบอร์โทร"] || row["เบอร์โทรศัพท์"];
            const phone = rawPhone ? String(rawPhone).trim() : null;

            // Check if name already exists (avoid duplicates)
            const existingStaff = await db.staff.findFirst({
                where: {
                    name,
                    status: 'active',
                }
            });

            if (existingStaff) {
                skippedNames.push(name);
                continue;
            }

            // Map other fields
            const rawRole = String(row.role || row["บทบาท"] || "").trim().toLowerCase();
            const role = roleMap[rawRole] || "STAFF";

            const rawEmpType = String(row.employeeType || row["ประเภทพนักงาน"] || "").trim().toLowerCase();
            const employeeType = typeMap[rawEmpType] || null;

            const position = row.position || row["ตำแหน่ง"] ? String(row.position || row["ตำแหน่ง"]).trim() : null;

            const dob = parseExcelDate(row.dateOfBirth || row["วันเกิด"] || row["วันเดือนปีเกิด"]) || DEFAULT_DOB;
            const password = dobToPassword(dob);
            const passwordHash = await hashPassword(password);

            const rawPaymentType = String(row.paymentType || row["ประเภทการจ่าย"] || "").trim().toLowerCase();
            const paymentType = paymentMap[rawPaymentType] || "daily";

            const rawRate = row.dailyRate || row["ค่าแรง"] || row["ค่าแรง (บาท)"] || row["ค่าจ้าง"];
            const dailyRate = rawRate ? parseFloat(String(rawRate)) : null;

            const rawComm = row.commissionAmount || row["คอมมิชชั่น"] || row["คอมมิชชั่น (บาท)"];
            const commissionAmount = rawComm ? parseFloat(String(rawComm)) : null;

            const bankName = row.bankName || row["ธนาคาร"] ? String(row.bankName || row["ธนาคาร"]).trim() : null;
            const bankAccountNo = row.bankAccountNo || row["เลขบัญชี"] || row["เลขที่บัญชี"] ? String(row.bankAccountNo || row["เลขบัญชี"] || row["เลขที่บัญชี"]).trim() : null;
            const taxId = row.taxId || row["เลขประจำตัวผู้เสียภาษี"] || row["เลขผู้เสียภาษี"] ? String(row.taxId || row["เลขประจำตัวผู้เสียภาษี"] || row["เลขผู้เสียภาษี"]).trim() : null;
            const address = row.address || row["ที่อยู่"] ? String(row.address || row["ที่อยู่"]).trim() : null;

            currentCodeNumber++;
            const code = `S${currentCodeNumber.toString().padStart(4, '0')}`;

            await db.staff.create({
                data: {
                    code,
                    name,
                    employeeType,
                    position,
                    role,
                    phone,
                    dateOfBirth: dob,
                    paymentType,
                    dailyRate,
                    commissionAmount,
                    bankName,
                    bankAccountNo,
                    taxId,
                    address,
                    passwordHash,
                    status: 'active',
                }
            });

            createdCount++;
        }

        return NextResponse.json({
            created: createdCount,
            skipped: skippedNames,
            errors,
        });

    } catch (error) {
        console.error("Failed to import staff:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาดในการประมวลผลการนำเข้า" }, { status: 500 });
    }
}
