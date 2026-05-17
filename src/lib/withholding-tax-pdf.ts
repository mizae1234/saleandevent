/**
 * Withholding Tax Certificate PDF generator — หนังสือรับรองการหักภาษี ณ ที่จ่าย
 * แบบ ภ.ง.ด.3 ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร
 * Uses browser-native print (HTML → PDF) to ensure correct Thai rendering.
 */

export interface WithholdingTaxData {
    staffName: string;
    staffCode: string;
    staffTaxId?: string;       // เลขประจำตัวผู้เสียภาษีของพนักงาน
    channelName: string;
    channelCode: string;
    daysWorked: number;
    dailyRate: number;
    totalWage: number;         // dailyRate × daysWorked
    commission: number;        // ค่าคอมมิสชั่น
    taxRate: number;           // 0.03 or 0
    wageTax: number;           // totalWage × 0.03
    commissionTax: number;     // commission × 0.03
    totalIncome: number;       // totalWage + commission
    totalTax: number;          // wageTax + commissionTax
    netPayable: number;        // totalIncome − totalTax
    documentDate: string;      // ISO string
    documentNo?: string;       // เลขที่เอกสาร
}

function formatMoney(n: number): string {
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateBuddhist(dateStr: string): string {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const buddhistYear = d.getFullYear() + 543;
    return `${day}/${month}/${buddhistYear}`;
}

function formatDateThaiLong(dateStr: string): string {
    const d = new Date(dateStr);
    const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const buddhistYear = d.getFullYear() + 543;
    return `${day} ${month} ${buddhistYear}`;
}

function numberToThaiText(num: number): string {
    if (num === 0) return "ศูนย์บาทถ้วน";
    const digits = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
    const positions = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

    const intPart = Math.floor(num);
    const decPart = Math.round((num - intPart) * 100);

    function convertInt(n: number): string {
        if (n === 0) return "";
        const str = String(n);
        let result = "";
        const len = str.length;
        for (let i = 0; i < len; i++) {
            const d = parseInt(str[i]);
            const pos = len - i - 1;
            if (d === 0) continue;
            if (pos === 0 && d === 1 && len > 1) {
                result += "เอ็ด";
            } else if (pos === 1 && d === 1) {
                result += "สิบ";
            } else if (pos === 1 && d === 2) {
                result += "ยี่สิบ";
            } else {
                result += digits[d] + positions[pos];
            }
        }
        return result;
    }

    let text = convertInt(intPart) + "บาท";
    if (decPart > 0) {
        text += convertInt(decPart) + "สตางค์";
    } else {
        text += "ถ้วน";
    }
    return text;
}

/**
 * Generate and print a withholding tax certificate (ภ.ง.ด.3) via browser print dialog
 */
export async function generateWithholdingTaxPdf(data: WithholdingTaxData) {
    const docDate = formatDateBuddhist(data.documentDate);
    const docDateLong = formatDateThaiLong(data.documentDate);
    const totalText = numberToThaiText(data.totalTax);
    const hasWage = data.totalWage > 0;
    const hasCommission = data.commission > 0;

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>ใบหัก ณ ที่จ่าย ภ.ง.ด.3 - ${data.staffCode}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  @page {
    size: A4 portrait;
    margin: 12mm 15mm;
  }

  body {
    font-family: 'Sarabun', sans-serif;
    font-size: 13px;
    color: #111;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Main border box */
  .form-container {
    border: 2px solid #333;
    padding: 0;
  }

  /* Header */
  .form-header {
    text-align: center;
    padding: 12px 16px 8px;
    border-bottom: 1px solid #333;
  }
  .form-header h1 {
    font-size: 18px;
    font-weight: 700;
  }
  .form-header .subtitle {
    font-size: 12px;
    color: #333;
    margin-top: 2px;
  }
  .form-header .doc-info {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
    font-size: 12px;
  }

  /* Payer / Payee Info */
  .info-section {
    padding: 8px 16px;
    border-bottom: 1px solid #333;
  }
  .info-section .label {
    font-weight: 600;
    font-size: 13px;
    margin-bottom: 3px;
  }
  .info-row {
    display: flex;
    gap: 12px;
    font-size: 13px;
    margin-bottom: 2px;
  }
  .info-row .key { color: #555; white-space: nowrap; }
  .info-row .val { font-weight: 600; }
  .info-flex {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  /* Income Table */
  .income-section {
    padding: 0;
  }
  .income-header {
    display: grid;
    grid-template-columns: 1fr 120px 120px 120px;
    background: #f5f5f5;
    border-bottom: 1px solid #333;
    font-weight: 700;
    font-size: 12px;
    text-align: center;
  }
  .income-header div {
    padding: 6px 8px;
    border-right: 1px solid #ccc;
  }
  .income-header div:last-child { border-right: none; }

  .income-row {
    display: grid;
    grid-template-columns: 1fr 120px 120px 120px;
    border-bottom: 1px solid #ddd;
    font-size: 12px;
  }
  .income-row > div {
    padding: 6px 8px;
    border-right: 1px solid #eee;
  }
  .income-row > div:last-child { border-right: none; }
  .income-row .desc { text-align: left; }
  .income-row .date, .income-row .amount, .income-row .tax {
    text-align: right;
    font-family: 'Sarabun', monospace;
  }
  .income-row.active { background: #fafafa; }
  .income-row.inactive { color: #bbb; }

  /* Total row */
  .total-row {
    display: grid;
    grid-template-columns: 1fr 120px 120px 120px;
    border-top: 2px solid #333;
    font-weight: 700;
    font-size: 13px;
    background: #f0fdf4;
  }
  .total-row > div {
    padding: 8px;
    border-right: 1px solid #ccc;
  }
  .total-row > div:last-child { border-right: none; }
  .total-row .amount, .total-row .tax { text-align: right; font-family: 'Sarabun', monospace; }

  /* Tax amount in text */
  .tax-text {
    padding: 6px 16px;
    font-size: 12px;
    border-top: 1px solid #ddd;
    border-bottom: 1px solid #333;
  }

  /* Checkbox section */
  .checkbox-section {
    padding: 10px 16px;
    border-bottom: 1px solid #333;
    display: flex;
    gap: 24px;
    font-size: 12px;
    flex-wrap: wrap;
  }
  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .checkbox-group .title { font-weight: 600; margin-bottom: 2px; }
  .cb-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .cb-box {
    width: 14px;
    height: 14px;
    border: 1.5px solid #333;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
  }
  .cb-box.checked::after { content: "✕"; }

  /* Certification */
  .cert-section {
    padding: 10px 16px;
    font-size: 12px;
    text-align: center;
    border-bottom: 1px solid #333;
    background: #fafafa;
  }

  /* Signatures */
  .sig-section {
    display: flex;
    justify-content: space-between;
    padding: 20px 40px 16px;
  }
  .sig-block {
    text-align: center;
    width: 40%;
  }
  .sig-line {
    border-top: 1px solid #333;
    margin-top: 40px;
    margin-bottom: 4px;
  }
  .sig-label {
    font-size: 12px;
    color: #333;
  }
  .sig-date {
    font-size: 11px;
    color: #666;
    margin-top: 2px;
  }

  @media print {
    body { padding: 0; }
    .form-container { border-width: 1.5px; }
  }
</style>
</head>
<body>

<div class="form-container">
  <!-- Header -->
  <div class="form-header">
    <h1>หนังสือรับรองการหักภาษี ณ ที่จ่าย</h1>
    <div class="subtitle">ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร</div>
    <div class="doc-info">
      <div>สำดับที่ *....&nbsp;&nbsp;&nbsp;ในแบบ แบบยื่น &nbsp;<strong>ภ.ง.ด.3</strong></div>
      <div>เลขที่ &nbsp;${data.documentNo || '—'}</div>
    </div>
  </div>

  <!-- Payer Info (ผู้จ่ายเงิน) -->
  <div class="info-section">
    <div class="label">ผู้มีหน้าที่หักภาษี ณ ที่จ่าย:</div>
    <div class="info-flex">
      <div>
        <div class="info-row">
          <span class="key">ชื่อ</span>
          <span class="val">บริษัท สวยไม่ไหว 2020 จำกัด</span>
        </div>
        <div class="info-row">
          <span class="key">ที่อยู่</span>
          <span>5/204 ถ.เทศบาลสงเคราะห์ แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900</span>
        </div>
      </div>
      <div>
        <div class="info-row">
          <span class="key">เลขประจำตัวผู้เสียภาษี</span>
          <span class="val">0105563046582</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Payee Info (ผู้ถูกหัก) -->
  <div class="info-section">
    <div class="label">ผู้ถูกหักภาษี ณ ที่จ่าย:</div>
    <div class="info-flex">
      <div>
        <div class="info-row">
          <span class="key">ชื่อ</span>
          <span class="val">${data.staffName}</span>
        </div>
        <div class="info-row">
          <span class="key">รหัสพนักงาน</span>
          <span>${data.staffCode}</span>
        </div>
      </div>
      <div>
        ${data.staffTaxId ? `
        <div class="info-row">
          <span class="key">เลขประจำตัวผู้เสียภาษี</span>
          <span class="val">${data.staffTaxId}</span>
        </div>
        ` : ''}
      </div>
    </div>
  </div>

  <!-- Income Type Table -->
  <div class="income-section">
    <div class="income-header">
      <div style="text-align:left;">ประเภทเงินได้พึงประเมินที่จ่าย</div>
      <div>วันเดือนปี<br>ภาษีที่จ่าย</div>
      <div>จำนวนเงิน<br>ที่จ่าย</div>
      <div>ภาษีที่หัก<br>และนำส่งไว้</div>
    </div>

    <!-- Row 1: ค่าจ้าง ม.40(1) -->
    <div class="income-row ${hasWage ? 'active' : 'inactive'}">
      <div class="desc">
        <strong>1.</strong> เงินเดือน ค่าจ้าง เบี้ยเลี้ยง โบนัส ฯลฯ ตาม ม.40(1)<br>
        <span style="font-size:11px; color:#666; padding-left:16px;">ค่าแรง ${data.dailyRate.toLocaleString()} × ${data.daysWorked} วัน = ${formatMoney(data.totalWage)}</span>
      </div>
      <div class="date">${hasWage ? docDate : ''}</div>
      <div class="amount">${hasWage ? formatMoney(data.totalWage) : ''}</div>
      <div class="tax">${hasWage && data.wageTax > 0 ? formatMoney(data.wageTax) : ''}</div>
    </div>

    <!-- Row 2: ค่านายหน้า / คอมมิสชั่น ม.40(2) -->
    <div class="income-row ${hasCommission ? 'active' : 'inactive'}">
      <div class="desc">
        <strong>2.</strong> ค่าธรรมเนียม ค่านายหน้า ฯลฯ ตามมาตรา 40(2)<br>
        <span style="font-size:11px; color:#666; padding-left:16px;">ค่าคอมมิสชั่น — ${data.channelCode} ${data.channelName}</span>
      </div>
      <div class="date">${hasCommission ? docDate : ''}</div>
      <div class="amount">${hasCommission ? formatMoney(data.commission) : ''}</div>
      <div class="tax">${hasCommission && data.commissionTax > 0 ? formatMoney(data.commissionTax) : ''}</div>
    </div>

    <!-- Row 3-6: empty categories -->
    <div class="income-row inactive">
      <div class="desc"><strong>3.</strong> ค่าแห่งลิขสิทธิ์ ฯลฯ ตามมาตรา 40(3)</div>
      <div class="date"></div><div class="amount"></div><div class="tax"></div>
    </div>
    <div class="income-row inactive">
      <div class="desc"><strong>4.</strong> (ก) ค่าดอกเบี้ย ฯลฯ ตามมาตรา 40(4)(ก)</div>
      <div class="date"></div><div class="amount"></div><div class="tax"></div>
    </div>
    <div class="income-row inactive">
      <div class="desc"><strong>5.</strong> การจ่ายเงินได้ที่ต้องหักภาษี ณ ที่จ่ายตามคำสั่งกรมสรรพากร ม.3 เตรส</div>
      <div class="date"></div><div class="amount"></div><div class="tax"></div>
    </div>
    <div class="income-row inactive">
      <div class="desc"><strong>6.</strong> อื่นๆ (ระบุ)</div>
      <div class="date"></div><div class="amount"></div><div class="tax"></div>
    </div>

    <!-- Total -->
    <div class="total-row">
      <div style="text-align:left;"><strong>รวมเงินที่จ่ายและภาษีที่หักนำส่ง</strong></div>
      <div></div>
      <div class="amount"><strong>${formatMoney(data.totalIncome)}</strong></div>
      <div class="tax"><strong>${formatMoney(data.totalTax)}</strong></div>
    </div>
  </div>

  <!-- Tax in Thai text -->
  <div class="tax-text">
    <strong>รวมเงินภาษีที่หักนำส่ง</strong> &nbsp;&nbsp;&nbsp;(${totalText})
  </div>

  <!-- Checkbox Section -->
  <div class="checkbox-section">
    <div class="checkbox-group">
      <div class="title">ผู้จ่ายเงิน</div>
      <div class="cb-item">
        <span class="cb-box checked"></span>
        <span>หักภาษี ณ ที่จ่าย</span>
      </div>
      <div class="cb-item">
        <span class="cb-box"></span>
        <span>ออกภาษีให้ครั้งเดียว</span>
      </div>
    </div>
    <div class="checkbox-group">
      <div class="title">&nbsp;</div>
      <div class="cb-item">
        <span class="cb-box"></span>
        <span>ออกให้ตลอดไป</span>
      </div>
      <div class="cb-item">
        <span class="cb-box"></span>
        <span>อื่นๆ (ระบุ) .......</span>
      </div>
    </div>
  </div>

  <!-- Certification -->
  <div class="cert-section">
    ขอรับรองว่าข้อความและตัวเลขดังกล่าวข้างต้นถูกต้องตรงกับความเป็นจริงทุกประการ
  </div>

  <!-- Signatures -->
  <div class="sig-section">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">ผู้มีหน้าที่หักภาษี ณ ที่จ่าย</div>
      <div class="sig-date">วันเดือนปี ที่ออกหนังสือรับรองฯ &nbsp;${docDateLong}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">ผู้ถูกหักภาษี ณ ที่จ่าย</div>
    </div>
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
