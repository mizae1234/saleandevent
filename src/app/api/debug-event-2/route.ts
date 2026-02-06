import { createEventWithDetails } from "@/actions/event-actions";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const formData = new FormData();
        formData.append("name", "Debug Event With Staff");
        formData.append("location", "Debug Location");
        formData.append("startDate", "2026-03-01");
        formData.append("endDate", "2026-03-05");
        formData.append("submitType", "submit");
        // Mock staff data with a real-looking UUID (randomly generated for now, purely for syntax check)
        // If there's a FK constraint on Staff, this will fail. 
        // But let's check if the previous error was about ARGUMENT or FK.
        // It was "Unknown argument". So passing ANY staff data triggered it.
        // We need a valid Staff ID if FK exists.
        // I'll skip staff for now to minimal test? 
        // NO, the error happened IN the staff block. I MUST include staff to test the fix.
        // I need a valid staff ID. I'll fetch one first? No, I can't easily.
        // The user's error trace showed a staffId: "a1b2c3d4-e5f6-7890-abcd-ef1234567806".
        // I'll use that.
        formData.append("staff", JSON.stringify([
            { staffId: "a1b2c3d4-e5f6-7890-abcd-ef1234567806", isMain: true },
            { staffId: "a1b2c3d4-e5f6-7890-abcd-ef1234567805", isMain: false }
        ]));
        formData.append("products", JSON.stringify([]));
        formData.append("equipment", JSON.stringify([]));

        const result = await createEventWithDetails(formData);
        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
