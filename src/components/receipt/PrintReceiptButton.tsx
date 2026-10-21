"use client";

import { useState } from "react";
import { Receipt, Printer } from "lucide-react";
import { getSingleReceiptData, SingleReceiptData } from "@/actions/receipt-actions";
import { ThermalReceiptModal } from "./ThermalReceiptModal";
import { Spinner } from "@/components/shared";
import { useToast } from "@/components/ui/toast";

interface Props {
    saleId: string;
    variant?: "icon" | "button" | "secondary";
    label?: string;
    className?: string;
}

export function PrintReceiptButton({
    saleId,
    variant = "icon",
    label = "พิมพ์ใบเสร็จ",
    className = "",
}: Props) {
    const [loading, setLoading] = useState(false);
    const [receiptData, setReceiptData] = useState<SingleReceiptData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { toastError } = useToast();

    const handleClick = async () => {
        setLoading(true);
        try {
            const data = await getSingleReceiptData(saleId);
            if (!data) {
                toastError("ไม่พบข้อมูลใบเสร็จนี้");
                return;
            }
            setReceiptData(data);
            setIsModalOpen(true);
        } catch (err: any) {
            console.error("Fetch receipt error:", err);
            toastError("เกิดข้อผิดพลาดในการโหลดใบเสร็จ");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {variant === "icon" ? (
                <button
                    type="button"
                    onClick={handleClick}
                    disabled={loading}
                    className={`p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors disabled:opacity-50 cursor-pointer ${className}`}
                    title={label}
                >
                    {loading ? <Spinner size="sm" /> : <Receipt className="h-4 w-4" />}
                </button>
            ) : variant === "secondary" ? (
                <button
                    type="button"
                    onClick={handleClick}
                    disabled={loading}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer ${className}`}
                >
                    {loading ? <Spinner size="sm" /> : <Printer className="h-3.5 w-3.5 text-slate-500" />}
                    <span>{label}</span>
                </button>
            ) : (
                <button
                    type="button"
                    onClick={handleClick}
                    disabled={loading}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer ${className}`}
                >
                    {loading ? <Spinner size="sm" /> : <Printer className="h-4 w-4" />}
                    <span>{label}</span>
                </button>
            )}

            {receiptData && (
                <ThermalReceiptModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    receipt={{ mode: "single", data: receiptData }}
                />
            )}
        </>
    );
}
