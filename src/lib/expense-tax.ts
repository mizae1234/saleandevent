/**
 * Core Tax Calculation Engine for Withholding Tax (ม.40(1) & ม.40(2))
 * Calculates taxes dynamically based on Master Expense Category whtType configuration.
 */

export interface ExpenseTaxItem {
    category: string;
    amount: number;
    whtType?: string | null;
}

export interface PayrollTaxInput {
    daysWorked: number;
    dailyRate: number;
    commission: number;
    expenses: ExpenseTaxItem[];
}

export interface PayrollTaxResult {
    daysWorked: number;
    dailyRate: number;
    baseWage: number;
    additional401: number;
    total401: number;
    wageTax: number;            // 40(1) 3% when daysWorked > 10
    commission: number;
    additional402: number;
    total402: number;
    commissionTax: number;      // 40(2) 3%
    totalWithholdingTax: number;// wageTax + commissionTax
    totalExpense: number;       // all expenses sum
    totalGrossPay: number;      // baseWage + commission + totalExpense
    netPay: number;             // totalGrossPay - totalWithholdingTax
}

/**
 * Fallback mapping for category name to whtType if whtType is missing or not provided.
 */
export function getExpenseWhtType(categoryName: string, configuredWhtType?: string | null): '40_1' | '40_2' | 'none' {
    if (configuredWhtType === '40_1' || configuredWhtType === '40_2' || configuredWhtType === 'none') {
        return configuredWhtType;
    }
    const cleanName = categoryName.trim();
    if (['ค่าลงงาน', 'ค่าเก็บงาน', 'ค่าลงของ', 'ค่าเก็บของ'].includes(cleanName)) {
        return '40_1';
    }
    if (['ค่าเป้า', 'ค่าคอม', 'ค่าคอมมิสชั่น'].includes(cleanName)) {
        return '40_2';
    }
    return 'none';
}

/**
 * Calculate dynamic withholding taxes (ม.40(1) and ม.40(2))
 * 
 * Rules:
 * 1. 40(1) Base = Wage (daysWorked × dailyRate) + sum of all expenses configured as '40_1' (e.g. ค่าลงงาน, ค่าเก็บงาน)
 *    40(1) Tax  = 40(1) Base × 3%
 * 
 * 2. 40(2) Base = Commission + sum of all expenses configured as '40_2' (e.g. ค่าเป้า)
 *    40(2) Tax  = 40(2) Base × 3%
 * 
 * 3. Total Withholding Tax = 40(1) Tax + 40(2) Tax
 */
export function calculatePayrollTax({
    daysWorked,
    dailyRate,
    commission,
    expenses,
}: PayrollTaxInput): PayrollTaxResult {
    const baseWage = daysWorked * dailyRate;

    // Filter expenses by resolved whtType
    let additional401 = 0;
    let additional402 = 0;
    let totalExpense = 0;

    for (const exp of expenses) {
        const amt = Number(exp.amount) || 0;
        totalExpense += amt;
        const whtType = getExpenseWhtType(exp.category, exp.whtType);
        if (whtType === '40_1') {
            additional401 += amt;
        } else if (whtType === '40_2') {
            additional402 += amt;
        }
    }

    // 40(1) calculation
    const total401 = baseWage + additional401;
    const wageTax = Math.round(total401 * 0.03 * 100) / 100;

    // 40(2) calculation
    const total402 = commission + additional402;
    const commissionTax = Math.round(total402 * 0.03 * 100) / 100;

    const totalWithholdingTax = wageTax + commissionTax;
    const totalGrossPay = baseWage + commission + totalExpense;
    const netPay = totalGrossPay - totalWithholdingTax;

    return {
        daysWorked,
        dailyRate,
        baseWage,
        additional401,
        total401,
        wageTax,
        commission,
        additional402,
        total402,
        commissionTax,
        totalWithholdingTax,
        totalExpense,
        totalGrossPay,
        netPay,
    };
}
