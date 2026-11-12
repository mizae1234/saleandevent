const THAI_MONTHS = [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม',
];

const THAI_MONTHS_SHORT = [
    'ม.ค.',
    'ก.พ.',
    'มี.ค.',
    'เม.ย.',
    'พ.ค.',
    'มิ.ย.',
    'ก.ค.',
    'ส.ค.',
    'ก.ย.',
    'ต.ค.',
    'พ.ย.',
    'ธ.ค.',
];

export function getCurrentPeriodMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

export function isValidPeriodMonth(val?: string | null): val is string {
    if (!val) return false;
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(val);
}

export function formatPeriodMonthThai(periodMonth: string, short = false): string {
    if (!isValidPeriodMonth(periodMonth)) return periodMonth;
    const [yearStr, monthStr] = periodMonth.split('-');
    const year = parseInt(yearStr, 10) + 543;
    const monthIndex = parseInt(monthStr, 10) - 1;
    const monthName = short ? THAI_MONTHS_SHORT[monthIndex] : THAI_MONTHS[monthIndex];
    return `${monthName} ${year}`;
}

export function getPeriodMonthDateRange(periodMonth: string): { start: Date; end: Date } {
    const [yearStr, monthStr] = periodMonth.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
    return { start, end };
}

export function getPeriodMonthOptions(pastMonths = 11, futureMonths = 2): { value: string; label: string }[] {
    const now = new Date();
    const options: { value: string; label: string }[] = [];
    for (let offset = futureMonths; offset >= -pastMonths; offset--) {
        const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        options.push({
            value: ym,
            label: `${formatPeriodMonthThai(ym)} (รอบจ่ายวันที่ 30)`,
        });
    }
    return options;
}

