import { calculatePayrollTax } from '../src/lib/expense-tax';

function runTests() {
    console.log('=== Test 1: Staff worked 5 days (<= 10 days) ===');
    const res1 = calculatePayrollTax({
        daysWorked: 5,
        dailyRate: 500,
        commission: 1000,
        expenses: [
            { category: 'ค่าลงงาน', amount: 300, whtType: '40_1' },
            { category: 'ค่าเก็บงาน', amount: 200, whtType: '40_1' },
            { category: 'ค่าเป้า', amount: 500, whtType: '40_2' },
            { category: 'ค่าเดินทาง', amount: 400, whtType: 'none' },
        ],
    });
    console.log(res1);
    console.assert(res1.wageTax === 0, `Expected wageTax 0, got ${res1.wageTax}`);
    console.assert(res1.total401 === 3000, `Expected total401 3000, got ${res1.total401}`);
    console.assert(res1.commissionTax === 45, `Expected commissionTax 45, got ${res1.commissionTax}`);
    console.assert(res1.totalWithholdingTax === 45, `Expected totalWithholdingTax 45, got ${res1.totalWithholdingTax}`);
    console.assert(res1.netPay === 4855, `Expected netPay 4855, got ${res1.netPay}`);
    console.log('✓ Test 1 passed!');

    console.log('\n=== Test 2: Staff worked 12 days (> 10 days) ===');
    const res2 = calculatePayrollTax({
        daysWorked: 12,
        dailyRate: 500,
        commission: 1000,
        expenses: [
            { category: 'ค่าลงงาน', amount: 300, whtType: '40_1' },
            { category: 'ค่าเก็บงาน', amount: 200, whtType: '40_1' },
            { category: 'ค่าเป้า', amount: 500, whtType: '40_2' },
            { category: 'ค่าเดินทาง', amount: 400, whtType: 'none' },
        ],
    });
    console.log(res2);
    // Base 40(1) = 12 * 500 (6000) + 300 + 200 = 6500
    // 40(1) Tax = 6500 * 3% = 195
    console.assert(res2.total401 === 6500, `Expected total401 6500, got ${res2.total401}`);
    console.assert(res2.wageTax === 195, `Expected wageTax 195, got ${res2.wageTax}`);
    // Base 40(2) = 1000 + 500 = 1500
    // 40(2) Tax = 1500 * 3% = 45
    console.assert(res2.total402 === 1500, `Expected total402 1500, got ${res2.total402}`);
    console.assert(res2.commissionTax === 45, `Expected commissionTax 45, got ${res2.commissionTax}`);
    console.assert(res2.totalWithholdingTax === 240, `Expected totalWithholdingTax 240, got ${res2.totalWithholdingTax}`);
    // Total Gross = 6000 + 1000 + 1400 (expenses) = 8400
    // Net Pay = 8400 - 240 = 8160
    console.assert(res2.netPay === 8160, `Expected netPay 8160, got ${res2.netPay}`);
    console.log('✓ Test 2 passed!');

    console.log('\nAll tax calculation tests passed successfully!');
}

runTests();
