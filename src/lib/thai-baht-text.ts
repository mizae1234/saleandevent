/**
 * Convert a number to Thai baht text representation
 * e.g. 1234.56 → "หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบหกสตางค์"
 */

const THAI_DIGITS = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const THAI_POSITIONS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

function convertChunk(n: number): string {
    if (n === 0) return '';

    const str = String(n);
    const len = str.length;
    let result = '';

    for (let i = 0; i < len; i++) {
        const digit = parseInt(str[i]);
        const pos = len - i - 1;

        if (digit === 0) continue;

        if (pos === 0 && digit === 1 && len > 1) {
            result += 'เอ็ด';
        } else if (pos === 1 && digit === 1) {
            result += 'สิบ';
        } else if (pos === 1 && digit === 2) {
            result += 'ยี่สิบ';
        } else {
            result += THAI_DIGITS[digit] + THAI_POSITIONS[pos];
        }
    }

    return result;
}

export function numberToThaiText(amount: number): string {
    if (amount === 0) return 'ศูนย์บาทถ้วน';
    if (isNaN(amount)) return '';

    const isNegative = amount < 0;
    amount = Math.abs(amount);

    // Split integer and decimal
    const [intStr, decStr] = amount.toFixed(2).split('.');
    const intPart = parseInt(intStr);
    const decPart = parseInt(decStr);

    let result = '';

    if (isNegative) result += 'ลบ';

    // Handle millions recursively
    if (intPart >= 1000000) {
        const millions = Math.floor(intPart / 1000000);
        const remainder = intPart % 1000000;
        result += convertChunk(millions) + 'ล้าน';
        if (remainder > 0) {
            result += convertChunk(remainder);
        }
    } else if (intPart > 0) {
        result += convertChunk(intPart);
    }

    if (intPart > 0) {
        result += 'บาท';
    }

    if (decPart > 0) {
        result += convertChunk(decPart) + 'สตางค์';
    } else {
        result += 'ถ้วน';
    }

    return result;
}
