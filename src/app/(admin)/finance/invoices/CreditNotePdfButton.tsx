"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Spinner } from "@/components/shared";
import { useToast } from "@/components/ui/toast";
import { generateCreditNotePdf } from "@/lib/credit-note-pdf";
import { getCreditNotePdfData } from "@/actions/credit-note-actions";

export function CreditNotePdfButton({ cnId, cnNumber }: { cnId: string; cnNumber: string | null }) {
    const [loading, setLoading] = useState(false);
    const { toastError } = useToast();

    const handleDownload = async () => {
        setLoading(true);
        try {
            const data = await getCreditNotePdfData(cnId);
            await generateCreditNotePdf(data);
        } catch (error) {
            console.error("PDF generation failed:", error);
            toastError("ไม่สามารถสร้าง PDF ได้");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors disabled:opacity-50"
            title={`Download Credit Note ${cnNumber || ""}`}
        >
            {loading ? (
                <Spinner size="sm" />
            ) : (
                <Download className="h-4 w-4" />
            )}
        </button>
    );
}
