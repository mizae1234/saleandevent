"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Spinner } from "@/components/shared";
import { useToast } from "@/components/ui/toast";

export function ExportStaffButton() {
    const [loading, setLoading] = useState(false);
    const { toastError, toastSuccess } = useToast();

    const handleExport = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/staff/export");
            if (!res.ok) throw new Error("Failed to fetch");
            const staffList = await res.json();

            if (staffList.length === 0) {
                toastError("ไม่พบข้อมูลพนักงาน");
                return;
            }

            const XLSX = await import("xlsx");

            const rows = staffList.map((s: any, i: number) => {
                const dob = s.dateOfBirth ? new Date(s.dateOfBirth) : null;
                const dobStr = dob
                    ? `${String(dob.getDate()).padStart(2, "0")}/${String(dob.getMonth() + 1).padStart(2, "0")}/${dob.getFullYear()}`
                    : "";
                const defaultDob = dob || new Date(2026, 0, 1);
                const pwd = `${String(defaultDob.getDate()).padStart(2, "0")}${String(defaultDob.getMonth() + 1).padStart(2, "0")}${defaultDob.getFullYear()}`;

                return {
                    "ลำดับ": i + 1,
                    "รหัส": s.code || "",
                    "ชื่อ-สกุล": s.name,
                    "ตำแหน่ง": s.position || "",
                    "บทบาท": s.role || "",
                    "ประเภทการจ่าย": s.paymentType === "daily" ? "รายวัน" : "รายเดือน",
                    "อัตราค่าจ้าง": s.dailyRate != null ? s.dailyRate : "***",
                    "วันเกิด (ค.ศ.)": dobStr,
                    "รหัสผ่านเริ่มต้น": pwd,
                    "อีเมล": s.email || "",
                    "เบอร์โทร": s.phone || "",
                    "ธนาคาร": s.bankName || "",
                    "เลขบัญชี": s.bankAccountNo || "",
                };
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            ws["!cols"] = [
                { wch: 6 },   // ลำดับ
                { wch: 8 },   // รหัส
                { wch: 30 },  // ชื่อ-สกุล
                { wch: 12 },  // ตำแหน่ง
                { wch: 10 },  // บทบาท
                { wch: 12 },  // ประเภทการจ่าย
                { wch: 12 },  // อัตราค่าจ้าง
                { wch: 14 },  // วันเกิด
                { wch: 14 },  // รหัสผ่านเริ่มต้น
                { wch: 20 },  // อีเมล
                { wch: 14 },  // เบอร์โทร
                { wch: 12 },  // ธนาคาร
                { wch: 16 },  // เลขบัญชี
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "พนักงาน");

            const d = new Date();
            const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
            XLSX.writeFile(wb, `staff_${dateStr}.xlsx`);

            toastSuccess(`Export สำเร็จ ${staffList.length} คน`);
        } catch {
            toastError("เกิดข้อผิดพลาดในการ Export");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl shadow-sm shadow-emerald-200/50 transition-colors disabled:opacity-50"
        >
            {loading ? <Spinner size="sm" /> : <FileSpreadsheet className="h-4 w-4" />}
            {loading ? "กำลัง Export..." : "Export Excel"}
        </button>
    );
}
