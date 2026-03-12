// ============ Channel / Event Status (shared) ============
// Unified status configuration for SalesChannel across all pages

export interface StatusConfig {
    label: string;
    bg: string;
    text: string;
    border: string;
}

export const CHANNEL_STATUS: Record<string, StatusConfig> = {
    draft: { label: "แบบร่าง", bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
    submitted: { label: "รออนุมัติ", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
    approved: { label: "อนุมัติ", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
    active: { label: "กำลังขาย", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" },
    selling: { label: "กำลังขาย", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" },
    packing: { label: "กำลังแพ็ค", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
    shipped: { label: "จัดส่งแล้ว", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-100" },
    received: { label: "รับสินค้าแล้ว", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-100" },
    returned: { label: "คืนสินค้าแล้ว", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-100" },
    closed: { label: "ปิดงาน", bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200" },
    payment_approved: { label: "อนุมัติจ่าย", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
    in_progress: { label: "กำลังดำเนินการ", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-100" },
    completed: { label: "เสร็จสิ้น", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-100" },
    pending_return: { label: "รอคืนสินค้า", bg: "bg-red-50", text: "text-red-600", border: "border-red-100" },
    pending_payment: { label: "รออนุมัติจ่าย", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
    returning: { label: "กำลังส่งคืน", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-100" },
};

/** Fallback status config for unknown statuses */
export const DEFAULT_STATUS: StatusConfig = {
    label: "ไม่ทราบ",
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
};

/** Get status config with fallback — use the raw status string as label if unknown */
export function getChannelStatus(status: string): StatusConfig {
    return CHANNEL_STATUS[status] || { ...DEFAULT_STATUS, label: status };
}

// ============ Packing Status (extends channel status with action) ============

export interface PackingStatusConfig extends StatusConfig {
    action: string;
}

export const PACKING_STATUS: Record<string, PackingStatusConfig> = {
    approved: { ...CHANNEL_STATUS.approved, label: "รอจัดสรร", action: "อัพโหลด Excel" },
    allocated: { label: "จัดสรรแล้ว", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-100", action: "แพ็คสินค้า" },
    packed: { label: "แพ็คแล้ว", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", action: "ดูรายละเอียด" },
};
