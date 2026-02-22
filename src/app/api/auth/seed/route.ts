import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { format } from "date-fns";

export async function POST() {
    try {
        const results: { name: string; code: string | null; password: string }[] = [];

        // 1. Ensure admin has password (code: A0001, password: admin123)
        const admin = await db.staff.findFirst({ where: { code: "A0001" } });
        if (admin && !admin.passwordHash) {
            const hash = await bcrypt.hash("admin123", 10);
            await db.staff.update({ where: { id: admin.id }, data: { passwordHash: hash } });
            results.push({ name: admin.name, code: admin.code, password: "admin123" });
        }

        // 2. Backfill all staff with DOB → password = ddMMyyyy
        const staffList = await db.staff.findMany({
            where: {
                status: "active",
                passwordHash: null,
                dateOfBirth: { not: null },
            },
        });

        for (const s of staffList) {
            if (!s.dateOfBirth) continue;
            const dobPassword = format(new Date(s.dateOfBirth), "ddMMyyyy");
            const hash = await bcrypt.hash(dobPassword, 10);
            await db.staff.update({ where: { id: s.id }, data: { passwordHash: hash } });
            results.push({ name: s.name, code: s.code, password: dobPassword });
        }

        return NextResponse.json({
            message: `Backfilled ${results.length} passwords`,
            results,
        });
    } catch (error) {
        console.error("Backfill error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
