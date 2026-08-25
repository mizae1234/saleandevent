import 'dotenv/config';
import { db } from '../src/lib/db';

const categories = [
    { name: 'ค่าลงงาน', type: 'emp', whtType: '40_1', sortOrder: 1 },
    { name: 'ค่าเก็บงาน', type: 'emp', whtType: '40_1', sortOrder: 2 },
    { name: 'ค่าเดินทาง', type: 'emp', whtType: 'none', sortOrder: 3 },
    { name: 'อื่นๆ', type: 'emp', whtType: 'none', sortOrder: 4 },
    { name: 'ค่าที่พัก', type: 'admin', whtType: 'none', sortOrder: 5 },
    { name: 'ค่าเบี้ยเลี้ยง', type: 'admin', whtType: 'none', sortOrder: 6 },
    { name: 'ค่าอาหาร', type: 'admin', whtType: 'none', sortOrder: 7 },
    { name: 'ค่าอุปกรณ์สิ้นเปลือง', type: 'admin', whtType: 'none', sortOrder: 8 },
    { name: 'ค่าขนส่ง', type: 'admin', whtType: 'none', sortOrder: 9 },
    { name: 'ค่า GP', type: 'admin', whtType: 'none', sortOrder: 10 },
    { name: 'ค่าเป้า', type: 'emp', whtType: '40_2', sortOrder: 11 },
];

async function main() {
    for (const cat of categories) {
        await db.expenseCategory.upsert({
            where: { name: cat.name },
            update: { type: cat.type, whtType: cat.whtType, sortOrder: cat.sortOrder },
            create: cat,
        });
        console.log(`✓ ${cat.name} (${cat.type}, wht: ${cat.whtType})`);
    }
    console.log(`\nDone! Seeded ${categories.length} expense categories.`);
}

main().catch(console.error).finally(() => db.$disconnect());
