"use client";

import { useState, useEffect } from "react";
import { X, Printer, Maximize2, Minimize2, Check } from "lucide-react";
import { SingleReceiptContent } from "./SingleReceiptContent";
import { DailySummaryContent } from "./DailySummaryContent";
import { SingleReceiptData, DailySummaryData } from "@/actions/receipt-actions";

type ReceiptProps =
    | { mode: "single"; data: SingleReceiptData }
    | { mode: "daily"; data: DailySummaryData };

interface Props {
    isOpen: boolean;
    onClose: () => void;
    receipt: ReceiptProps;
    initialWidth?: "80mm" | "58mm";
}

export function ThermalReceiptModal({
    isOpen,
    onClose,
    receipt,
    initialWidth = "80mm",
}: Props) {
    const [widthMode, setWidthMode] = useState<"80mm" | "58mm">(initialWidth);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handlePrint = () => {
        window.print();
    };

    const title =
        receipt.mode === "single"
            ? `บิลรายย่อย • ${widthMode === "80mm" ? "80 มม." : "58 มม."}`
            : `สรุปยอดรายวัน • ${widthMode === "80mm" ? "80 มม." : "58 มม."}`;

    return (
        <>
            {/* Dedicated Print Stylesheet injected into DOM */}
            <style jsx global>{`
                @media print {
                    /* Hide entire web page */
                    body * {
                        visibility: hidden !important;
                    }
                    /* Show only the thermal receipt container */
                    #thermal-receipt-printable,
                    #thermal-receipt-printable * {
                        visibility: visible !important;
                    }
                    #thermal-receipt-printable {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: ${widthMode === "80mm" ? "78mm" : "56mm"} !important;
                        margin: 0 !important;
                        padding: ${widthMode === "80mm" ? "3mm" : "2mm"} !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    @page {
                        size: ${widthMode === "80mm" ? "80mm" : "58mm"} auto;
                        margin: 0;
                    }
                }
            `}</style>

            {/* Modal Backdrop */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in">
                {/* Modal Container */}
                <div
                    className={`bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 border border-slate-200 ${
                        isFullscreen
                            ? "w-full h-full max-w-none rounded-none"
                            : "w-full max-w-lg max-h-[92vh]"
                    }`}
                >
                    {/* Header Bar */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                                {title}
                            </h2>

                            {/* Size Toggle Switch */}
                            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setWidthMode("80mm")}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                                        widthMode === "80mm"
                                            ? "bg-white text-teal-700 shadow-xs"
                                            : "text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    80 มม.
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setWidthMode("58mm")}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                                        widthMode === "58mm"
                                            ? "bg-white text-teal-700 shadow-xs"
                                            : "text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    58 มม.
                                </button>
                            </div>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex items-center gap-1.5">
                            {/* Fullscreen Button */}
                            <button
                                type="button"
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                title={isFullscreen ? "ย่อหน้าจอ" : "ขยายเต็มจอ"}
                            >
                                {isFullscreen ? (
                                    <Minimize2 className="h-4 w-4" />
                                ) : (
                                    <Maximize2 className="h-4 w-4" />
                                )}
                            </button>

                            {/* Print Button */}
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
                                title="พิมพ์ใบเสร็จ (เครื่องพิมพ์ความร้อน)"
                            >
                                <Printer className="h-4 w-4" />
                                <span>พิมพ์บิล</span>
                            </button>

                            {/* Close Button */}
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors ml-1"
                                title="ปิด"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Receipt Preview Area */}
                    <div className="flex-1 overflow-y-auto bg-slate-100/90 p-4 sm:p-8 flex justify-center items-start">
                        <div className="transition-all duration-200 shadow-xl rounded-sm">
                            {receipt.mode === "single" ? (
                                <SingleReceiptContent
                                    data={receipt.data}
                                    widthMode={widthMode}
                                />
                            ) : (
                                <DailySummaryContent
                                    data={receipt.data}
                                    widthMode={widthMode}
                                />
                            )}
                        </div>
                    </div>

                    {/* Bottom Helper Bar */}
                    <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>สามารถเลือกขนาดกระดาษ 80 มม. หรือ 58 มม. ได้ตามเครื่องพิมพ์ที่ใช้</span>
                        <span className="font-mono text-slate-500">ESC เพื่อปิด</span>
                    </div>
                </div>
            </div>
        </>
    );
}
