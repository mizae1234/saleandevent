import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST() {
    try {
        // Check if test staff already exists
        const existing = await db.staff.findFirst({
            where: { email: "staff@saranjeans.com" },
        });

        if (existing) {
            return NextResponse.json({ message: "Staff already exists", email: existing.email });
        }

        const hash = await bcrypt.hash("staff123", 10);

        // Create staff user
        const staff = await db.staff.create({
            data: {
                code: "S0010",
                name: "สมศรี พนักงาน",
                email: "staff@saranjeans.com",
                passwordHash: hash,
                role: "STAFF",
                paymentType: "daily",
                dailyRate: 500,
            },
        });

        // Assign to first active channel
        const channel = await db.salesChannel.findFirst({
            where: { status: 'active' },
        });

        if (channel) {
            await db.channelStaff.create({
                data: {
                    channelId: channel.id,
                    staffId: staff.id,
                    role: "PC",
                },
            });

            return NextResponse.json({
                message: "Staff created and assigned",
                email: "staff@saranjeans.com",
                password: "staff123",
                assignedChannel: channel.name,
            });
        }

        return NextResponse.json({
            message: "Staff created (no active channel to assign)",
            email: "staff@saranjeans.com",
            password: "staff123",
        });
    } catch (error) {
        console.error("Seed error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
