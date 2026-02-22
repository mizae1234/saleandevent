import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { format } from "date-fns";

// Assigns DOB to staff who don't have one, then sets password = ddMMyyyy
export async function POST() {
    try {
        // Sample DOBs for existing staff (one per staff, in order of createdAt)
        const sampleDOBs = [
            new Date("1990-03-15"),
            new Date("1988-07-22"),
            new Date("1992-11-08"),
            new Date("1985-01-30"),
            new Date("1993-05-12"),
            new Date("1991-09-25"),
            new Date("1987-12-03"),
            new Date("1994-06-18"),
            new Date("1989-04-27"),
            new Date("1996-08-14"),
        ];

        // Get all active staff without DOB (excluding admin A0001)
        const staffList = await db.staff.findMany({
            where: {
                status: "active",
                dateOfBirth: null,
                code: { not: "A0001" },
            },
            orderBy: { createdAt: "asc" },
        });

        const results: { code: string | null; name: string; dob: string; password: string }[] = [];

        for (let i = 0; i < staffList.length; i++) {
            const s = staffList[i];
            const dob = sampleDOBs[i % sampleDOBs.length];
            const dobPassword = format(dob, "ddMMyyyy");
            const hash = await bcrypt.hash(dobPassword, 10);

            await db.staff.update({
                where: { id: s.id },
                data: {
                    dateOfBirth: dob,
                    passwordHash: hash,
                },
            });

            results.push({
                code: s.code,
                name: s.name,
                dob: format(dob, "dd/MM/yyyy"),
                password: dobPassword,
            });
        }

        return NextResponse.json({
            message: `Set DOB & passwords for ${results.length} staff`,
            results,
        });
    } catch (error) {
        console.error("Setup error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
