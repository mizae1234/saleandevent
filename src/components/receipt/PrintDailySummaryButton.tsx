"use client";

import { useState } from "react";
import { FileText, Printer } from "lucide-react";
import { getDailySalesSummaryData, DailySummaryData } from "@/actions/receipt-actions";
import { ThermalReceiptModal } from "./ThermalReceiptModal";
import { Spinner } from "@/components/shared";
import { useToast } from "@/components/ui/toast";

interface Props {
    channelId: string;
    targetDate?: string; // YYYY-MM-DD
    label?: string;
    variant?: "primary" | "secondary" | "outline";
    className?: string;
}

export function PrintDailySummaryButton({
    channelId,
    targetDate,
    label = "พิมพ์สรุปยอดรายวัน",
    variant = "secondary",
    className = "",
}: Props) {
    const [loading, setLoading] = useState(false);
    const [summaryData, setSummaryData] = useState<DailySummaryData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { toastError } = useToast();

    const handleClick = async () => {
        setLoading(true);
        try {
            const data = await getDailySalesSummaryData(channelId, targetDate);
            if (!data) {
                toastError("ไม่พบข้อมูลสรุปยอดขายของจุดขายนี้");
                return;
            }
            setSummaryData(data);
            setIsModalOpen(true);
        } catch (err: any) {
            console.error("Fetch daily summary error:", err);
            toastError("เกิดข้อผิดพลาดในการโหลดสรุปยอดขาย");
        } finally {
            setLoading(false);
        }
    };

    const variantStyles =
        variant === "primary"
            ? "bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
            : variant === "outline"
            ? "border border-teal-600 text-teal-700 hover:bg-teal-50"
            : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs";

    return (
        <>
            <button
                type="button"
                onClick={handleClick}
                disabled={loading}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer ${variantStyles} ${className}`}
            >
                {loading ? (
                    <Spinner size="sm" />
                ) : (
                    <FileText className="h-4 w-4 text-teal-600" />
                )}
                <span>{label}</span>
            </button>

            {summaryData && (
                <ThermalReceiptModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    receipt={{ mode: "daily", data: summaryData }}
                />
            )}
        </>
    );
}
