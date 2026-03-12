/**
 * Withholding Tax Certificate PDF generator — ใบหัก ณ ที่จ่าย (ภาษี 3% จากค่าแรง)
 * Uses browser-native print (HTML → PDF) to ensure correct Thai rendering.
 */

export interface WithholdingTaxData {
    staffName: string;
    staffCode: string;
    channelName: string;
    channelCode: string;
    daysWorked: number;
    dailyRate: number;
    totalWage: number;       // dailyRate × daysWorked
    taxRate: number;          // 0.03 or 0
    taxAmount: number;        // totalWage × 0.03
    netPayable: number;       // totalWage − taxAmount
    documentDate: string;     // ISO string
}

function formatMoney(n: number): string {
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateThai(dateStr: string): string {
    const d = new Date(dateStr);
    const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const buddhistYear = d.getFullYear() + 543;
    return `${day} ${month} ${buddhistYear}`;
}

/**
 * Generate and print a withholding tax certificate via browser print dialog
 */
export async function generateWithholdingTaxPdf(data: WithholdingTaxData) {
    const taxLabel = data.taxRate > 0
        ? `ภาษีหัก ณ ที่จ่าย 3%`
        : `ภาษีหัก ณ ที่จ่าย`;

    const subtitle = data.taxRate > 0
        ? `(ภาษีหัก ณ ที่จ่าย ค่าจ้างทำของ 3%)`
        : '';

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>ใบหัก ณ ที่จ่าย - ${data.staffCode}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  @page {
    size: A4 portrait;
    margin: 15mm;
  }

  body {
    font-family: 'Sarabun', sans-serif;
    font-size: 14px;
    color: #111;
    line-height: 1.6;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .header {
    text-align: center;
    margin-bottom: 8px;
  }
  .header h1 {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 2px;
  }
  .header .subtitle {
    font-size: 14px;
    font-weight: 400;
    color: #555;
  }

  .divider {
    border: none;
    border-top: 2px solid #111;
    margin: 12px 0;
  }
  .divider-thin {
    border: none;
    border-top: 1px solid #ccc;
    margin: 10px 0;
  }

  .section-title {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 6px;
  }

  .info-row {
    padding-left: 16px;
    font-size: 14px;
    margin-bottom: 3px;
  }

  .info-row-flex {
    display: flex;
    justify-content: space-between;
    padding-left: 16px;
    font-size: 14px;
    margin-bottom: 3px;
  }

  .section { margin-bottom: 16px; }

  /* Calculation Table */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
  }
  th, td {
    border: 1px solid #333;
    padding: 8px 12px;
    font-size: 14px;
  }
  th {
    background: #f0f0f0;
    font-weight: 700;
    text-align: left;
  }
  th:last-child, td:last-child {
    text-align: right;
  }
  .total-row {
    background: #f0fdf4;
    font-weight: 700;
    font-size: 15px;
  }

  /* Date */
  .date-section {
    margin-top: 20px;
    font-size: 14px;
  }

  /* Signatures */
  .signatures {
    display: flex;
    justify-content: space-between;
    margin-top: 50px;
    padding: 0 20px;
  }
  .sig-block {
    text-align: center;
    width: 40%;
  }
  .sig-line {
    border-top: 1px solid #111;
    margin-bottom: 6px;
    width: 100%;
  }
  .sig-label {
    font-size: 13px;
    color: #333;
  }

  @media print {
    body { padding: 0; }
  }
</style>
</head>
<body>

<div class="header">
  <h1>ใบหัก ณ ที่จ่าย</h1>
  ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
</div>

<hr class="divider">

<div class="section">
  <div class="section-title">ผู้จ่ายเงิน (ผู้หักภาษี ณ ที่จ่าย)</div>
  <div class="info-row">ชื่อ: บริษัท สวยไม่ไหว 2020 จำกัด</div>
  <div class="info-row">เลขประจำตัวผู้เสียภาษี: 0105563046582</div>
  <div class="info-row">ที่อยู่: 5/204 ถนนเทศบาลสงเคราะห์ แขวงลาดยาว เขตจตุจักร กรุงเทพมหานคร</div>
</div>

<div class="section">
  <div class="section-title">ผู้ถูกหักภาษี ณ ที่จ่าย</div>
  <div class="info-row-flex">
    <span>ชื่อ: ${data.staffName}</span>
    <span>รหัสพนักงาน: ${data.staffCode}</span>
  </div>
</div>

<hr class="divider-thin">

<div class="section">
  <div class="section-title">รายละเอียดงาน</div>
  <div class="info-row">Event/สาขา: ${data.channelCode} — ${data.channelName}</div>
  <div class="info-row">จำนวนวันทำงาน: ${data.daysWorked} วัน</div>
</div>

<div class="section">
  <div class="section-title">รายละเอียดการคำนวณ</div>
  <table>
    <thead>
      <tr>
        <th>รายการ</th>
        <th>จำนวนเงิน (บาท)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>ค่าแรง/วัน × ${data.daysWorked} วัน (${formatMoney(data.dailyRate)} × ${data.daysWorked})</td>
        <td>${formatMoney(data.totalWage)}</td>
      </tr>
      <tr>
        <td>${taxLabel}</td>
        <td>${data.taxRate > 0 ? formatMoney(data.taxAmount) : '0.00'}</td>
      </tr>
      <tr class="total-row">
        <td>จำนวนเงินที่จ่ายจริง</td>
        <td>${formatMoney(data.netPayable)}</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="date-section">
  วันที่ออกเอกสาร: ${formatDateThai(data.documentDate)}
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="sig-line"></div>
    <div class="sig-label">ผู้จ่ายเงิน / ผู้หักภาษี</div>
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <div class="sig-label">ผู้รับเงิน / ผู้ถูกหักภาษี</div>
  </div>
</div>

</body>
</html>`;

    // Open a new window and print
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) {
        alert('กรุณาอนุญาต pop-up เพื่อดาวน์โหลดเอกสาร');
        return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for fonts to load, then trigger print
    printWindow.onload = () => {
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };
}
