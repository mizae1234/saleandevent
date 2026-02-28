"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { generateInvoicePdf, type InvoicePdfData } from "@/lib/invoice-pdf";

interface InvoicePdfButtonProps {
    invoiceId: string;
    invoiceNumber: string | null;
}

export function InvoicePdfButton({ invoiceId, invoiceNumber }: InvoicePdfButtonProps) {
    const [loading, setLoading] = useState(false);
    const { toastError } = useToast();

    const handleDownload = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/invoices/${invoiceId}`);
            if (!res.ok) throw new Error("Failed to fetch invoice");
            const data: InvoicePdfData = await res.json();

            await generateInvoicePdf(data);
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
            title={`Download ${invoiceNumber || "Invoice"}`}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Download className="h-4 w-4" />
            )}
        </button>
    );
}
