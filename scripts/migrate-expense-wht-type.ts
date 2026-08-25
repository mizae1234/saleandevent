import 'dotenv/config';
import { db } from '../src/lib/db';

async function main() {
    console.log('Running safe migration: ADD COLUMN wht_type to expense_categories...');
    await db.$executeRawUnsafe(`
        ALTER TABLE "expense_categories" ADD COLUMN IF NOT EXISTS "wht_type" VARCHAR(20) NOT NULL DEFAULT 'none';
    `);

    console.log('Updating initial wht_type values...');
    await db.$executeRawUnsafe(`
        UPDATE "expense_categories" SET "wht_type" = '40_1' WHERE "name" IN ('ค่าลงงาน', 'ค่าเก็บงาน');
    `);
    await db.$executeRawUnsafe(`
        UPDATE "expense_categories" SET "wht_type" = '40_2' WHERE "name" IN ('ค่าเป้า');
    `);
    await db.$executeRawUnsafe(`
        UPDATE "expense_categories" SET "wht_type" = 'none' WHERE "wht_type" IS NULL;
    `);

    const result = await db.expenseCategory.findMany({
        orderBy: { sortOrder: 'asc' },
    });
    console.log('Updated Expense Categories:', result);
    console.log('Migration completed successfully!');
}

main().catch(console.error).finally(() => db.$disconnect());
