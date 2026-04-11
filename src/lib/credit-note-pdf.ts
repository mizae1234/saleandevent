// No top level imports for jspdf to avoid SSR issues

export interface CreditNotePdfData {
    cnNumber: string | null;
    cnDate: string | null;
    reason: string | null;
    totalAmount: number;
    invoiceNumber: string | null;
    channel: { code: string; name: string; location: string };
    customer: {
        name: string;
        taxId: string | null;
        address: string | null;
        phone: string | null;
    } | null;
    items: {
        barcode: string;
        productName: string;
        size: string;
        color: string;
        qty: number;
        unitPrice: number;
        totalAmount: number;
    }[];
}

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

export async function generateCreditNotePdf(data: CreditNotePdfData) {
    const fonts = await loadThaiFonts();

    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    // Use default import via required interop if necessary, but matching invoice-pdf.ts approach
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

    // HEADER
    doc.setFont("Sarabun", "bold");
    doc.setFontSize(18);
    doc.text("บริษัท สวยไม่ไหว 2020 จำกัด", marginLeft, 16);

    doc.setFontSize(12);
    doc.setFont("Sarabun", "normal");
    doc.text("เลขประจำตัวผู้เสียภาษี 0 1 0 5 5 6 3 0 4 6 5 8 2", marginLeft, 23);
    doc.text("5/204 ถนนเทศบาลสงเคราะห์ แขวงลาดยาว เขตจตุจักร จังหวัดกรุงเทพมหานคร", marginLeft, 29);

    doc.setFontSize(16);
    doc.setFont("Sarabun", "bold");
    doc.text("ใบลดหนี้ / Credit Note", rightX, 16, { align: "right" });

    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, 33, rightX, 33);

    // META
    const cnDate = formatDate(data.cnDate);
    doc.setFontSize(11);
    doc.setFont("Sarabun", "normal");

    let metaY = 39;
    if (data.customer) {
        doc.setFont("Sarabun", "bold");
        doc.text(data.customer.name, marginLeft, metaY);
        doc.setFont("Sarabun", "normal");
        let cy = metaY + 6;
        if (data.customer.taxId) doc.text(`เลขประจำตัวผู้เสียภาษี: ${data.customer.taxId}`, marginLeft, cy), cy += 6;
        if (data.customer.address) doc.text(`ที่อยู่: ${data.customer.address}`, marginLeft, cy), cy += 6;
        metaY = Math.max(metaY, cy - 6);
    } else {
        doc.text("ลูกค้า: " + data.channel.name, marginLeft, metaY);
    }

    doc.text(`อ้างอิงถึงบิล (Invoice): ${data.invoiceNumber || "-"}`, marginLeft, metaY + 6);
    
    doc.text("เลขที่ลดหนี้: " + (data.cnNumber || "(ไม่มีเลข)"), rightX, 39, { align: "right" });
    doc.text("วันที่: " + cnDate, rightX, 45, { align: "right" });

    // ITEMS
    const tableStartY = metaY + 16;
    const tableRows = data.items.map((item, i) => {
        const desc = item.productName +
            (item.color && item.color !== "-" ? " " + item.color : "") +
            (item.size && item.size !== "-" ? " " + item.size : "");
        return [
            String(i + 1),
            desc,
            item.qty.toLocaleString(),
            formatMoney(item.unitPrice),
            formatMoney(item.totalAmount),
        ];
    });

    autoTable(doc, {
        startY: tableStartY,
        head: [["ลำดับที่", "รหัสสินค้า/รายละเอียดที่ลด", "จำนวนลด", "หน่วยละ", "ราคารวม"]],
        body: tableRows,
        theme: "grid",
        styles: { fontSize: 11, cellPadding: 2, lineColor: [0,0,0], lineWidth: 0.2, textColor: [0,0,0], font: "Sarabun" },
        headStyles: { fillColor: [240, 240, 240], textColor: [0,0,0], fontStyle: "bold", halign: "center", font: "Sarabun" },
        columnStyles: {
            0: { halign: "center", cellWidth: 18 },
            1: { halign: "left", cellWidth: 78 },
            2: { halign: "center", cellWidth: 25 },
            3: { halign: "right", cellWidth: 28 },
            4: { halign: "right", cellWidth: 32 },
        },
        margin: { left: marginLeft, right: marginRight },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 2;
    const footerColStart = pageWidth - marginRight - 95;
    const amountCol = rightX;

    doc.setFont("Sarabun", "normal");
    doc.setFontSize(11);

    let rowY = finalY + 6;
    doc.setLineWidth(0.2);
    doc.line(footerColStart, rowY, amountCol, rowY);
    doc.setFont("Sarabun", "bold");
    doc.text("มูลค่าลดหนี้สุทธิ (Net Credit Amount)", footerColStart + 3, rowY + 6);
    doc.text(formatMoney(data.totalAmount), amountCol - 3, rowY + 6, { align: "right" });
    rowY += 9;
    doc.line(footerColStart, rowY, amountCol, rowY);

    if (data.reason) {
        doc.setFont("Sarabun", "normal");
        doc.setFontSize(9);
        doc.text(`เหตุผลการลดหนี้: ${data.reason}`, marginLeft, rowY + 6);
    }

    const sigY = rowY + 30;
    doc.setFont("Sarabun", "normal");
    doc.setFontSize(11);
    doc.line(marginLeft + 5, sigY, marginLeft + 60, sigY);
    doc.text("ผู้มีอำนาจลงนาม", marginLeft + 18, sigY + 6);
    
    // Save
    const fileName = `CreditNote_${data.cnNumber || "Draft"}.pdf`;
    doc.save(fileName);
}
