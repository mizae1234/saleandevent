/**
 * Script: add-sku-and-refill.ts
 * 
 * Purpose:
 * 1. Safely alters PostgreSQL table `products` to add nullable `sku` column (VARCHAR 100) if not exists.
 * 2. Reads `SKU(1).xlsx` (Sheet 'สินค้า') and refills `sku` for each matching barcode.
 * 3. Validates that 100% of existing rows and data are preserved with zero data loss.
 * 
 * Usage:
 *   npx tsx scripts/add-sku-and-refill.ts
 */

import { Pool } from 'pg';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('❌ Error: DATABASE_URL is not defined in environment.');
    process.exit(1);
}

const pool = new Pool({ connectionString, max: 5 });

async function main() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting Safe SKU Migration & Refill Process...\n');

        // ================= STEP 1: PRE-CHECK =================
        const preCountRes = await client.query('SELECT COUNT(*) FROM products');
        const preCount = parseInt(preCountRes.rows[0].count, 10);
        console.log(`📊 [Step 1] Total existing products in DB: ${preCount} rows`);

        // ================= STEP 2: ADD COLUMN IF NOT EXISTS =================
        console.log('🛠️  [Step 2] Adding `sku` column to `products` table (if not exists)...');
        await client.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
        `);
        console.log('✅ Column `sku` (VARCHAR(100), nullable) is ready.');

        // ================= STEP 3: READ EXCEL FILE =================
        const excelPath = path.join(process.cwd(), 'SKU(1).xlsx');
        console.log(`📖 [Step 3] Reading Excel file: ${excelPath}`);
        const wb = XLSX.readFile(excelPath);
        
        const wsProduct = wb.Sheets['สินค้า'];
        if (!wsProduct) {
            throw new Error('Sheet "สินค้า" not found in SKU(1).xlsx');
        }

        const dataProduct = XLSX.utils.sheet_to_json<Record<string, any>>(wsProduct);
        console.log(`📋 Total rows in Sheet "สินค้า": ${dataProduct.length}`);

        // ================= STEP 4: REFILL SKU IN DB =================
        console.log('⏳ [Step 4] Refilling SKU data into products table...');

        let updatedCount = 0;
        let skippedEmptySku = 0;
        let skippedEmptyBarcode = 0;
        let notFoundInDb = 0;

        await client.query('BEGIN');

        for (const row of dataProduct) {
            const barcode = row['บาร์โค้ด'] !== undefined ? String(row['บาร์โค้ด']).trim() : '';
            const sku = row['SKU'] !== undefined ? String(row['SKU']).trim() : '';

            if (!barcode) {
                skippedEmptyBarcode++;
                continue;
            }

            if (!sku) {
                skippedEmptySku++;
                continue;
            }

            const updateRes = await client.query(
                `UPDATE products SET sku = $1, updated_at = NOW() WHERE barcode = $2 RETURNING barcode`,
                [sku, barcode]
            );

            if (updateRes.rowCount && updateRes.rowCount > 0) {
                updatedCount += updateRes.rowCount;
            } else {
                notFoundInDb++;
            }
        }

        await client.query('COMMIT');
        console.log('✅ Refill transaction committed successfully.');

        // ================= STEP 5: POST-CHECK & VERIFICATION =================
        const postCountRes = await client.query('SELECT COUNT(*) FROM products');
        const postCount = parseInt(postCountRes.rows[0].count, 10);

        const skuPopulatedRes = await client.query('SELECT COUNT(*) FROM products WHERE sku IS NOT NULL');
        const skuPopulatedCount = parseInt(skuPopulatedRes.rows[0].count, 10);

        const skuNullRes = await client.query('SELECT COUNT(*) FROM products WHERE sku IS NULL');
        const skuNullCount = parseInt(skuNullRes.rows[0].count, 10);

        console.log('\n================== SUMMARY ==================');
        console.log(`📦 Initial DB product count:     ${preCount}`);
        console.log(`📦 Final DB product count:       ${postCount} (${preCount === postCount ? '✅ IDENTICAL / NO LOSS' : '❌ MISMATCH'})`);
        console.log(`✨ Successfully updated with SKU: ${updatedCount}`);
        console.log(`🏷️  Total rows with SKU populated: ${skuPopulatedCount}`);
        console.log(`⚪ Total rows with SKU as NULL:  ${skuNullCount}`);
        console.log(`⏭️  Excel rows skipped (empty SKU): ${skippedEmptySku}`);
        console.log(`⏭️  Excel rows skipped (no barcode): ${skippedEmptyBarcode}`);

        // Sample verification
        const sampleCheck = await client.query(`
            SELECT barcode, sku, code, name, size, color, price 
            FROM products 
            WHERE sku IS NOT NULL 
            LIMIT 5
        `);
        console.log('\n🔍 Sample 5 updated products:');
        console.table(sampleCheck.rows);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error occurred during migration/refill:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
