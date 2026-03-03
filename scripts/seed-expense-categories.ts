import 'dotenv/config';
import { db } from '../src/lib/db';

const categories = [
    { name: 'ค่าลงงาน', type: 'emp', sortOrder: 1 },
    { name: 'ค่าเก็บงาน', type: 'emp', sortOrder: 2 },
    { name: 'ค่าเดินทาง', type: 'emp', sortOrder: 3 },
    { name: 'อื่นๆ', type: 'emp', sortOrder: 4 },
    { name: 'ค่าที่พัก', type: 'admin', sortOrder: 5 },
    { name: 'ค่าเบี้ยเลี้ยง', type: 'admin', sortOrder: 6 },
    { name: 'ค่าอาหาร', type: 'admin', sortOrder: 7 },
    { name: 'ค่าอุปกรณ์สิ้นเปลือง', type: 'admin', sortOrder: 8 },
    { name: 'ค่าขนส่ง', type: 'admin', sortOrder: 9 },
    { name: 'ค่า GP', type: 'admin', sortOrder: 10 },
];

async function main() {
    for (const cat of categories) {
        await db.expenseCategory.upsert({
            where: { name: cat.name },
            update: { type: cat.type, sortOrder: cat.sortOrder },
            create: cat,
        });
        console.log(`✓ ${cat.name} (${cat.type})`);
    }
    console.log(`\nDone! Seeded ${categories.length} expense categories.`);
}

main().catch(console.error).finally(() => db.$disconnect());
