"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

interface InvoicePdfButtonProps {
    invoiceId: string;
    invoiceNumber: string | null;
}

interface InvoiceData {
    invoiceNumber: string | null;
    invoiceDate: string | null;
    invoicePercent: number;
    totalQuantity: number;
    totalAmount: number;
    discountPercent: number;
    discountAmount: number;
    vatAmount: number;
    grandTotal: number;
    notes: string | null;
    channel: { code: string; name: string; location: string };
    customer: { name: string; taxId: string | null; address: string | null } | null;
    items: {
        barcode: string;
        productCode: string;
        productName: string;
        size: string;
        color: string;
        invoiceQty: number;
        unitPrice: number;
        totalAmount: number;
    }[];
}

export function InvoicePdfButton({ invoiceId, invoiceNumber }: InvoicePdfButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        setLoading(true);
        try {
            // Fetch the invoice data
            const res = await fetch(`/api/invoices/${invoiceId}`);
            if (!res.ok) throw new Error("Failed to fetch invoice");
            const data: InvoiceData = await res.json();

            // Dynamic import to avoid SSR issues
            const { jsPDF } = await import("jspdf");
            const autoTable = (await import("jspdf-autotable")).default;

            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 15;

            // ─── Header ───
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text("INVOICE", pageWidth / 2, 20, { align: "center" });

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");

            // Company / Channel info (left)
            let y = 32;
            doc.setFont("helvetica", "bold");
            doc.text("Saran Jeans", margin, y);
            doc.setFont("helvetica", "normal");
            doc.text(`Event: ${data.channel.code} - ${data.channel.name}`, margin, y + 5);
            doc.text(`Location: ${data.channel.location}`, margin, y + 10);

            // Invoice info (right)
            const rightX = pageWidth - margin;
            doc.setFont("helvetica", "bold");
            doc.text(data.invoiceNumber || "DRAFT", rightX, y, { align: "right" });
            doc.setFont("helvetica", "normal");
            if (data.invoiceDate) {
                const d = new Date(data.invoiceDate);
                doc.text(`Date: ${d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`, rightX, y + 5, { align: "right" });
            }
            doc.text(`Invoice %: ${data.invoicePercent}%`, rightX, y + 10, { align: "right" });

            // Customer info
            y = 52;
            if (data.customer) {
                doc.setDrawColor(200);
                doc.line(margin, y, pageWidth - margin, y);
                y += 5;
                doc.setFont("helvetica", "bold");
                doc.text("Bill To:", margin, y);
                doc.setFont("helvetica", "normal");
                doc.text(data.customer.name, margin + 18, y);
                if (data.customer.taxId) {
                    doc.text(`Tax ID: ${data.customer.taxId}`, margin + 18, y + 5);
                    y += 5;
                }
                if (data.customer.address) {
                    doc.text(data.customer.address, margin + 18, y + 5);
                    y += 5;
                }
                y += 8;
            } else {
                y += 5;
            }

            // ─── Items Table ───
            const tableHead = [["#", "Code", "Product", "Size", "Color", "Qty", "Unit Price", "Amount"]];
            const tableBody = data.items.map((item, idx) => [
                String(idx + 1),
                item.productCode,
                item.productName,
                item.size,
                item.color,
                item.invoiceQty.toLocaleString(),
                item.unitPrice.toLocaleString("th-TH", { minimumFractionDigits: 2 }),
                item.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 }),
            ]);

            autoTable(doc, {
                startY: y,
                head: tableHead,
                body: tableBody,
                theme: "grid",
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: "bold" },
                columnStyles: {
                    0: { halign: "center", cellWidth: 10 },
                    1: { cellWidth: 22 },
                    2: { cellWidth: 40 },
                    3: { halign: "center", cellWidth: 18 },
                    4: { halign: "center", cellWidth: 18 },
                    5: { halign: "right", cellWidth: 15 },
                    6: { halign: "right", cellWidth: 25 },
                    7: { halign: "right", cellWidth: 25 },
                },
                margin: { left: margin, right: margin },
            });

            // ─── Summary ───
            const finalY = (doc as any).lastAutoTable.finalY + 8;
            const summaryX = pageWidth - margin - 70;
            const valueX = pageWidth - margin;
            let sy = finalY;

            const summaryLine = (label: string, value: string, bold = false) => {
                doc.setFont("helvetica", bold ? "bold" : "normal");
                doc.text(label, summaryX, sy);
                doc.text(value, valueX, sy, { align: "right" });
                sy += 6;
            };

            doc.setFontSize(9);
            summaryLine("Total Qty:", data.totalQuantity.toLocaleString());
            summaryLine("Subtotal:", `${data.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`);

            if (data.discountAmount > 0) {
                summaryLine(`Discount (${data.discountPercent}%):`, `-${data.discountAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`);
            }

            if (data.vatAmount > 0) {
                summaryLine("VAT (7%):", data.vatAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 }));
            }

            doc.setDrawColor(200);
            doc.line(summaryX, sy - 2, valueX, sy - 2);
            sy += 2;
            doc.setFontSize(11);
            summaryLine("Grand Total:", `${data.grandTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })} THB`, true);

            // Notes
            if (data.notes) {
                sy += 6;
                doc.setFontSize(8);
                doc.setFont("helvetica", "italic");
                doc.text(`Notes: ${data.notes}`, margin, sy);
            }

            // ─── Save ───
            const fileName = data.invoiceNumber
                ? `Invoice_${data.invoiceNumber}.pdf`
                : `Invoice_Draft_${invoiceId.slice(0, 8)}.pdf`;
            doc.save(fileName);
        } catch (error) {
            console.error("PDF generation failed:", error);
            alert("ไม่สามารถสร้าง PDF ได้");
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
