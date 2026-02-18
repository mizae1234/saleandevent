import { createChannelWithDetails } from "@/actions/channel-actions";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const formData = new FormData();
        formData.append("type", "EVENT");
        formData.append("name", "Debug Channel With Staff");
        formData.append("location", "Debug Location");
        formData.append("startDate", "2026-03-01");
        formData.append("endDate", "2026-03-05");
        formData.append("submitType", "submit");
        formData.append("staff", JSON.stringify([
            { staffId: "a1b2c3d4-e5f6-7890-abcd-ef1234567806", isMain: true },
            { staffId: "a1b2c3d4-e5f6-7890-abcd-ef1234567805", isMain: false }
        ]));
        formData.append("products", JSON.stringify([]));
        formData.append("equipment", JSON.stringify([]));

        const result = await createChannelWithDetails(formData);
        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
