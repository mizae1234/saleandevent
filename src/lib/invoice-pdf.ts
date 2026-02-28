/**
 * Shared Invoice PDF generator — "ใบกำกับสินค้า / ใบกำกับภาษี" format.
 * Used by both the channel detail page and the finance/invoices page.
 */

export interface InvoicePdfData {
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
    customer: {
        name: string;
        taxId: string | null;
        address: string | null;
        phone: string | null;
        creditTerm: number | null;
    } | null;
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

// ─── Font helpers ───
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
        fetch("/fonts/Sarabun-Regular.ttf").then((r) => r.arrayBuffer()),
        fetch("/fonts/Sarabun-Bold.ttf").then((r) => r.arrayBuffer()),
    ]);
    fontCache = {
        regular: await arrayBufferToBase64(regularBuf),
        bold: await arrayBufferToBase64(boldBuf),
    };
    return fontCache;
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

/**
 * Generate and save an invoice PDF in the standard ใบกำกับสินค้า/ใบกำกับภาษี format.
 */
export async function generateInvoicePdf(data: InvoicePdfData) {
    const fonts = await loadThaiFonts();

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
    const marginLeft = 12;
    const marginRight = 12;
    const rightX = pageWidth - marginRight;

    // ═══════════════════════════════════════
    //  HEADER: Company info (left) + Document title (right)
    // ═══════════════════════════════════════
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

    // Document title (right side)
    doc.setFontSize(16);
    doc.setFont("Sarabun", "bold");
    doc.text("ใบกำกับสินค้า/ใบกำกับภาษี", rightX, 16, { align: "right" });

    // ─── Divider line ───
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, 33, rightX, 33);

    // ═══════════════════════════════════════
    //  META: Customer info (left) + Invoice info (right)
    // ═══════════════════════════════════════
    const invoiceDate = formatDate(data.invoiceDate);

    doc.setFontSize(11);
    doc.setFont("Sarabun", "normal");

    let metaY = 39;

    // --- Left side: Customer info ---
    if (data.customer) {
        doc.setFont("Sarabun", "bold");
        doc.text(data.customer.name, marginLeft, metaY);
        doc.setFont("Sarabun", "normal");
        let cy = metaY + 6;
        if (data.customer.taxId) {
            doc.text(`เลขประจำตัวผู้เสียภาษี: ${data.customer.taxId}`, marginLeft, cy);
            cy += 6;
        }
        if (data.customer.phone) {
            doc.text(`โทร: ${data.customer.phone}`, marginLeft, cy);
            cy += 6;
        }
        if (data.customer.address) {
            doc.text(`ที่อยู่: ${data.customer.address}`, marginLeft, cy);
            cy += 6;
        }
        if (data.customer.creditTerm && data.customer.creditTerm > 0) {
            doc.text(`เครดิต: ${data.customer.creditTerm} วัน`, marginLeft, cy);
            cy += 6;
        }
        metaY = Math.max(metaY, cy - 6);
    } else {
        doc.text("ลูกค้า: " + data.channel.name, marginLeft, metaY);
    }

    // Event info
    doc.text(`Event: ${data.channel.code} — ${data.channel.name}`, marginLeft, metaY + 6);
    doc.text(`สถานที่: ${data.channel.location}`, marginLeft, metaY + 12);

    // --- Right side: Invoice number + date ---
    doc.text(
        "เลขที่ใบกำกับ: " + (data.invoiceNumber || "(ฉบับร่าง)"),
        rightX,
        39,
        { align: "right" }
    );
    doc.text("วันที่: " + invoiceDate, rightX, 45, { align: "right" });

    // ═══════════════════════════════════════
    //  ITEMS TABLE
    // ═══════════════════════════════════════
    const tableStartY = metaY + 20;

    const tableRows = data.items.map((item, i) => {
        const desc =
            item.productCode +
            " " +
            item.productName +
            (item.color && item.color !== "-" ? " " + item.color : "") +
            (item.size && item.size !== "-" ? " " + item.size : "");
        return [
            String(i + 1),
            desc,
            item.invoiceQty.toLocaleString() + " ตัว",
            formatMoney(item.unitPrice),
            formatMoney(item.totalAmount),
        ];
    });

    autoTable(doc, {
        startY: tableStartY,
        head: [["ลำดับที่", "รหัสสินค้า/รายละเอียด", "จำนวน", "หน่วยละ", "ราคารวม"]],
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

    // ═══════════════════════════════════════
    //  FOOTER: Totals
    // ═══════════════════════════════════════
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable.finalY + 2;

    const footerColStart = pageWidth - marginRight - 95;
    const amountCol = rightX;

    doc.setFont("Sarabun", "normal");
    doc.setFontSize(11);

    // Row 1: รวมเป็นเงิน (subtotal before discount)
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.line(footerColStart, finalY, amountCol, finalY);
    doc.text("รวมเป็นเงิน", footerColStart + 3, finalY + 6);
    doc.text(formatMoney(data.totalAmount), amountCol - 3, finalY + 6, {
        align: "right",
    });

    let rowY = finalY + 9;

    // Row 2: ส่วนลด (if any)
    if (data.discountAmount > 0) {
        doc.line(footerColStart, rowY, amountCol, rowY);
        doc.text(
            `ส่วนลด (${data.discountPercent}%)`,
            footerColStart + 3,
            rowY + 6
        );
        doc.text("-" + formatMoney(data.discountAmount), amountCol - 3, rowY + 6, {
            align: "right",
        });
        rowY += 9;
    }

    // Row 3: จำนวนเงินรวมทั้งสิ้น (grand total)
    doc.line(footerColStart, rowY, amountCol, rowY);
    doc.setFont("Sarabun", "bold");
    doc.text("จำนวนเงินรวมทั้งสิ้น", footerColStart + 3, rowY + 6);
    doc.text(formatMoney(data.grandTotal), amountCol - 3, rowY + 6, {
        align: "right",
    });
    rowY += 9;

    // Row 4: VAT 7% (if any)
    if (data.vatAmount > 0) {
        doc.line(footerColStart, rowY, amountCol, rowY);
        doc.setFont("Sarabun", "normal");
        doc.text("จำนวนภาษีมูลค่าเพิ่ม 7%", footerColStart + 3, rowY + 6);
        doc.text(formatMoney(data.vatAmount), amountCol - 3, rowY + 6, {
            align: "right",
        });
        rowY += 9;
    }

    doc.line(footerColStart, rowY, amountCol, rowY);

    // Notes
    if (data.notes) {
        doc.setFont("Sarabun", "normal");
        doc.setFontSize(9);
        doc.text(`หมายเหตุ: ${data.notes}`, marginLeft, rowY + 6);
    }

    // ═══════════════════════════════════════
    //  SIGNATURE AREA
    // ═══════════════════════════════════════
    const sigY = rowY + 30;

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

    // ─── Save ───
    const fileName = data.invoiceNumber
        ? `Invoice_${data.invoiceNumber}.pdf`
        : `Invoice_${data.channel.code}.pdf`;
    doc.save(fileName);
}
