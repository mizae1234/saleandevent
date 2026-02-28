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

// Load Thai font from public dir (cached after first load)
let fontCache: { regular: string; bold: string } | null = null;

async function arrayBufferToBase64(buf: ArrayBuffer): Promise<string> {
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
    }
    return btoa(binary);
}

async function loadThaiFonts(): Promise<{ regular: string; bold: string }> {
    if (fontCache) return fontCache;
    const [regularBuf, boldBuf] = await Promise.all([
        fetch("/fonts/Sarabun-Regular.ttf").then(r => r.arrayBuffer()),
        fetch("/fonts/Sarabun-Bold.ttf").then(r => r.arrayBuffer()),
    ]);
    fontCache = {
        regular: await arrayBufferToBase64(regularBuf),
        bold: await arrayBufferToBase64(boldBuf),
    };
    return fontCache;
}

export function InvoicePdfButton({ invoiceId, invoiceNumber }: InvoicePdfButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        setLoading(true);
        try {
            // Load fonts + data in parallel
            const [fonts, res] = await Promise.all([
                loadThaiFonts(),
                fetch(`/api/invoices/${invoiceId}`),
            ]);
            if (!res.ok) throw new Error("Failed to fetch invoice");
            const data: InvoiceData = await res.json();

            const { jsPDF } = await import("jspdf");
            const autoTable = (await import("jspdf-autotable")).default;

            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

            // Register Thai fonts
            doc.addFileToVFS("Sarabun-Regular.ttf", fonts.regular);
            doc.addFont("Sarabun-Regular.ttf", "Sarabun", "normal");
            doc.addFileToVFS("Sarabun-Bold.ttf", fonts.bold);
            doc.addFont("Sarabun-Bold.ttf", "Sarabun", "bold");
            doc.setFont("Sarabun");

            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 15;
            const rightX = pageWidth - margin;

            // ═══════════════════════════════════════
            //  HEADER: INVOICE title
            // ═══════════════════════════════════════
            doc.setFontSize(22);
            doc.text("INVOICE / ใบแจ้งหนี้", pageWidth / 2, 20, { align: "center" });

            // ─── Invoice info (right side) ───
            let y = 30;
            doc.setFontSize(12);
            doc.text(data.invoiceNumber || "(ฉบับร่าง)", rightX, y, { align: "right" });
            doc.setFontSize(9);
            if (data.invoiceDate) {
                const d = new Date(data.invoiceDate);
                doc.text(
                    `วันที่: ${d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}`,
                    rightX, y + 6, { align: "right" }
                );
            }
            doc.text(`สัดส่วน Invoice: ${data.invoicePercent}%`, rightX, y + 12, { align: "right" });

            // ─── Company info (left side) ───
            y = 30;
            doc.setFontSize(13);
            doc.text("บริษัท สวยไม่ไหว 2020 จำกัด", margin, y);
            doc.setFontSize(9);
            doc.text("5/204 ถนนเทศบาลสงเคราะห์ แขวงลาดยาว เขตจตุจักร", margin, y + 6);
            doc.text("จังหวัดกรุงเทพมหานคร", margin, y + 11);
            doc.text("เลขที่ประจำตัวผู้เสียภาษี 0105563046582", margin, y + 16);

            // ─── Divider ───
            y = 52;
            doc.setDrawColor(200);
            doc.line(margin, y, rightX, y);

            // ─── Customer info ───
            y = 57;
            doc.setFontSize(10);
            doc.text("ลูกค้า:", margin, y);
            if (data.customer) {
                doc.text(data.customer.name, margin + 15, y);
                let cy = y + 5;
                if (data.customer.address) {
                    doc.setFontSize(9);
                    doc.text(data.customer.address, margin + 15, cy);
                    cy += 5;
                }
                if (data.customer.taxId) {
                    doc.setFontSize(9);
                    doc.text(`เลขผู้เสียภาษี: ${data.customer.taxId}`, margin + 15, cy);
                    cy += 5;
                }
                y = cy + 2;
            } else {
                doc.text("-", margin + 15, y);
                y += 7;
            }

            // ─── Event info ───
            doc.setFontSize(9);
            doc.text(`Event: ${data.channel.code} — ${data.channel.name} (${data.channel.location})`, margin, y);
            y += 7;

            // ═══════════════════════════════════════
            //  ITEMS TABLE
            // ═══════════════════════════════════════
            const tableHead = [["#", "รหัส", "สินค้า", "ไซส์", "สี", "จำนวน", "ราคา/ชิ้น", "รวม"]];
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
                styles: { font: "Sarabun", fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: "bold", font: "Sarabun" },
                columnStyles: {
                    0: { halign: "center", cellWidth: 10 },
                    1: { cellWidth: 20 },
                    2: { cellWidth: 42 },
                    3: { halign: "center", cellWidth: 16 },
                    4: { halign: "center", cellWidth: 20 },
                    5: { halign: "right", cellWidth: 16 },
                    6: { halign: "right", cellWidth: 25 },
                    7: { halign: "right", cellWidth: 25 },
                },
                margin: { left: margin, right: margin },
            });

            // ═══════════════════════════════════════
            //  SUMMARY
            // ═══════════════════════════════════════
            const finalY = (doc as any).lastAutoTable.finalY + 8;
            const summaryX = pageWidth - margin - 70;
            let sy = finalY;

            const summaryLine = (label: string, value: string, bold = false, fontSize = 9) => {
                doc.setFontSize(fontSize);
                doc.text(label, summaryX, sy);
                doc.text(value, rightX, sy, { align: "right" });
                sy += 6;
            };

            summaryLine("จำนวนรวม:", `${data.totalQuantity.toLocaleString()} ชิ้น`);
            summaryLine("ยอดรวมสินค้า:", `฿${data.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`);

            if (data.discountAmount > 0) {
                summaryLine(`ส่วนลด (${data.discountPercent}%):`, `-฿${data.discountAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`);
            }

            if (data.vatAmount > 0) {
                summaryLine("VAT (7%):", `฿${data.vatAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`);
            }

            doc.setDrawColor(180);
            doc.line(summaryX, sy - 2, rightX, sy - 2);
            sy += 3;
            summaryLine("ยอดสุทธิ:", `฿${data.grandTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`, true, 12);

            // Notes
            if (data.notes) {
                sy += 4;
                doc.setFontSize(8);
                doc.text(`หมายเหตุ: ${data.notes}`, margin, sy);
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
