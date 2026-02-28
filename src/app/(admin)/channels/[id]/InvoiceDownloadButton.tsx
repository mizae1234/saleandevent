"use client";

import { useState } from "react";
import { FileText, Loader2, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Sarabun_normal, Sarabun_bold } from "@/lib/thai-font";

interface Props {
    channelId: string;
    channelName: string;
}

interface InvoiceItem {
    code: string;
    name: string;
    producttype: string;
    color: string;
    size: string;
    packedQuantity: number;
    invoiceQuantity: number;
    unitPrice: number;
}

interface ShipmentData {
    shipmentNumber: number;
    requestType: string;
    shippedAt: string | null;
    items: InvoiceItem[];
}

interface InvoiceResponse {
    channel: { name: string; code: string; location: string };
    shipments: ShipmentData[];
}

function formatMoney(n: number): string {
    return n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) {
        const d = new Date();
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const buddhistYear = d.getFullYear() + 543;
        return `${day}/${month}/${buddhistYear}`;
    }
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const buddhistYear = d.getFullYear() + 543;
    return `${day}/${month}/${buddhistYear}`;
}

function generateInvoiceNumber(shipmentIndex: number): string {
    const now = new Date();
    const yy = String(now.getFullYear() + 543).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const seq = String(shipmentIndex + 1).padStart(4, "0");
    return `IV${yy}${mm}${seq}`;
}

function registerThaiFont(doc: jsPDF) {
    doc.addFileToVFS("Sarabun-Regular.ttf", Sarabun_normal);
    doc.addFileToVFS("Sarabun-Bold.ttf", Sarabun_bold);
    doc.addFont("Sarabun-Regular.ttf", "Sarabun", "normal");
    doc.addFont("Sarabun-Bold.ttf", "Sarabun", "bold");
}

function generateInvoicePDF(data: InvoiceResponse, shipmentIndex: number) {
    const shipment = data.shipments[shipmentIndex];
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Register Thai font
    registerThaiFont(doc);

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 12;
    const marginRight = 12;

    // === HEADER: Company Info ===
    doc.setFont("Sarabun", "bold");
    doc.setFontSize(18);
    doc.text("บริษัท สวยไม่ไหว 2020 จำกัด", marginLeft, 16);

    doc.setFontSize(12);
    doc.setFont("Sarabun", "normal");
    doc.text(
        "เลขประจำตัวผู้เสียภาษี 0 1 0 5 5 6 3 0 4 6 5 8 2",
        marginLeft,
        23
    );
    doc.text(
        "5/204 ถนนเทศบาลสงเคราะห์ แขวงลาดยาว เขตจตุจักร จังหวัดกรุงเทพมหานคร",
        marginLeft,
        29
    );

    // === Document title ===
    doc.setFontSize(16);
    doc.setFont("Sarabun", "bold");
    doc.text("ใบกำกับสินค้า/ใบกำกับภาษี", pageWidth - marginRight, 16, {
        align: "right",
    });

    // สำเนา
    doc.setFontSize(22);
    doc.text("สำเนา", pageWidth - marginRight, 28, { align: "right" });

    // === Divider line ===
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, 33, pageWidth - marginRight, 33);

    // === Invoice meta info ===
    const invoiceNo = generateInvoiceNumber(shipmentIndex);
    const invoiceDate = formatDate(shipment.shippedAt);

    doc.setFontSize(11);
    doc.setFont("Sarabun", "normal");

    const metaY = 39;
    doc.text("ลูกค้า: " + data.channel.name, marginLeft, metaY);
    doc.text("รหัส: " + data.channel.code, marginLeft, metaY + 6);
    doc.text("สถานที่: " + data.channel.location, marginLeft, metaY + 12);

    doc.text("เลขที่ใบกำกับ: " + invoiceNo, pageWidth - marginRight, metaY, {
        align: "right",
    });
    doc.text("วันที่: " + invoiceDate, pageWidth - marginRight, metaY + 6, {
        align: "right",
    });
    const shipLabel = shipment.requestType === "INITIAL" ? "เริ่มต้น" : "เพิ่มเติม";
    doc.text(
        "การจัดส่งครั้งที่: " + shipment.shipmentNumber + " (" + shipLabel + ")",
        pageWidth - marginRight,
        metaY + 12,
        { align: "right" }
    );

    // === TABLE ===
    const tableRows = shipment.items.map((item, i) => {
        const desc = item.code + " " + item.producttype + (item.color ? " " + item.color : "") + (item.size ? " " + item.size : "");
        const total = item.invoiceQuantity * item.unitPrice;
        return [
            String(i + 1),
            desc,
            item.invoiceQuantity.toFixed(1) + " ตัว",
            formatMoney(item.unitPrice),
            formatMoney(total),
        ];
    });

    // Calculate totals
    const subtotal = shipment.items.reduce(
        (sum, item) => sum + item.invoiceQuantity * item.unitPrice,
        0
    );
    const vat = subtotal * 0.07;
    const grandTotal = subtotal + vat;

    autoTable(doc, {
        startY: metaY + 18,
        head: [
            [
                "ลำดับที่",
                "รหัสสินค้า/รายละเอียด",
                "จำนวน",
                "หน่วยละ",
                "ราคารวมภาษี",
            ],
        ],
        body: tableRows,
        theme: "grid",
        styles: {
            fontSize: 11,
            cellPadding: 2,
            lineColor: [0, 0, 0],
            lineWidth: 0.2,
            textColor: [0, 0, 0],
            font: "Sarabun",
        },
        headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: "bold",
            halign: "center",
            font: "Sarabun",
        },
        columnStyles: {
            0: { halign: "center", cellWidth: 18 },
            1: { halign: "left", cellWidth: 75 },
            2: { halign: "center", cellWidth: 28 },
            3: { halign: "right", cellWidth: 28 },
            4: { halign: "right", cellWidth: 32 },
        },
        margin: { left: marginLeft, right: marginRight },
    });

    // === FOOTER: Totals ===
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable.finalY + 2;

    const footerColStart = pageWidth - marginRight - 95;
    const amountCol = pageWidth - marginRight;

    doc.setFont("Sarabun", "normal");
    doc.setFontSize(11);

    // Row 1: รวมเป็นเงิน
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.line(footerColStart, finalY, amountCol, finalY);
    doc.text("รวมเป็นเงิน", footerColStart + 3, finalY + 6);
    doc.text(formatMoney(subtotal), amountCol - 3, finalY + 6, {
        align: "right",
    });

    // Row 2: จำนวนเงินรวมทั้งสิ้น
    doc.line(footerColStart, finalY + 9, amountCol, finalY + 9);
    doc.setFont("Sarabun", "bold");
    doc.text(
        "จำนวนเงินรวมทั้งสิ้น",
        footerColStart + 3,
        finalY + 15
    );
    doc.text(formatMoney(grandTotal), amountCol - 3, finalY + 15, {
        align: "right",
    });

    // Row 3: VAT 7%
    doc.line(footerColStart, finalY + 18, amountCol, finalY + 18);
    doc.setFont("Sarabun", "normal");
    doc.text(
        "จำนวนภาษีมูลค่าเพิ่ม 7%",
        footerColStart + 3,
        finalY + 24
    );
    doc.text(formatMoney(vat), amountCol - 3, finalY + 24, {
        align: "right",
    });
    doc.line(footerColStart, finalY + 27, amountCol, finalY + 27);

    // === SIGNATURE AREA ===
    const sigY = finalY + 45;

    doc.setFont("Sarabun", "normal");
    doc.setFontSize(11);

    // Left: ผู้รับสินค้า
    doc.line(marginLeft + 5, sigY, marginLeft + 60, sigY);
    doc.text("ผู้รับสินค้า", marginLeft + 22, sigY + 6);

    // Center: วันที่
    const sigCenterX = pageWidth / 2;
    doc.line(sigCenterX - 25, sigY, sigCenterX + 25, sigY);
    doc.text("วันที่", sigCenterX - 5, sigY + 6);

    // Right: ผู้รับมอบอำนาจ
    const sigRightX = pageWidth - marginRight - 30;
    doc.line(sigRightX - 25, sigY, sigRightX + 30, sigY);
    doc.text("ผู้รับมอบอำนาจ", sigRightX - 12, sigY + 6);

    // Save the PDF
    const fileName = "Invoice_" + data.channel.code + "_" + shipment.shipmentNumber + ".pdf";
    doc.save(fileName);
}

export function InvoiceDownloadButton({ channelId, channelName }: Props) {
    const [loading, setLoading] = useState(false);
    const [shipments, setShipments] = useState<ShipmentData[] | null>(null);
    const [showPicker, setShowPicker] = useState(false);

    const fetchAndDownload = async (shipmentIndex?: number) => {
        setLoading(true);
        try {
            const res = await fetch("/api/channels/" + channelId + "/invoice");
            if (!res.ok) {
                const err = await res.json();
                alert(err.error || "ไม่พบข้อมูลการจัดส่ง");
                return;
            }
            const data: InvoiceResponse = await res.json();

            if (data.shipments.length === 1) {
                generateInvoicePDF(data, 0);
            } else if (shipmentIndex !== undefined) {
                generateInvoicePDF(data, shipmentIndex);
            } else {
                setShipments(data.shipments);
                setShowPicker(true);
            }
        } catch {
            alert("เกิดข้อผิดพลาดในการสร้าง Invoice");
        } finally {
            setLoading(false);
        }
    };

    const handlePickerDownload = async (index: number) => {
        setLoading(true);
        try {
            const res = await fetch("/api/channels/" + channelId + "/invoice");
            if (!res.ok) return;
            const data: InvoiceResponse = await res.json();
            generateInvoicePDF(data, index);
        } catch {
            alert("เกิดข้อผิดพลาด");
        } finally {
            setLoading(false);
            setShowPicker(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => fetchAndDownload()}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 transition-colors"
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <FileText className="h-4 w-4" />
                )}
                {loading ? "กำลังสร้าง..." : "ดาวน์โหลด Invoice"}
            </button>

            {showPicker && shipments && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-5 max-w-md w-full mx-4 shadow-xl">
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">
                            เลือกการจัดส่ง
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                            มีการจัดส่ง {shipments.length} ครั้ง เลือกครั้งที่ต้องการออก Invoice
                        </p>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {shipments.map((s, i) => {
                                const totalItems = s.items.reduce(
                                    (sum, item) => sum + item.invoiceQuantity,
                                    0
                                );
                                const totalAmount = s.items.reduce(
                                    (sum, item) => sum + item.invoiceQuantity * item.unitPrice,
                                    0
                                );
                                return (
                                    <button
                                        key={i}
                                        onClick={() => handlePickerDownload(i)}
                                        disabled={loading}
                                        className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">
                                                    ครั้งที่ {s.shipmentNumber}{" "}
                                                    <span className="text-xs text-slate-400">
                                                        ({s.requestType === "INITIAL" ? "เริ่มต้น" : "เพิ่มเติม"})
                                                    </span>
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {totalItems} รายการ · ฿{formatMoney(totalAmount)}
                                                    {s.shippedAt && (" · " + formatDate(s.shippedAt))}
                                                </p>
                                            </div>
                                            <Download className="h-4 w-4 text-indigo-500" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setShowPicker(false)}
                            className="w-full mt-3 px-4 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg"
                        >
                            ยกเลิก
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
