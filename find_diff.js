const { Client } = require('pg');

const client = new Client({
    host: '187.77.134.84',
    port: 5432,
    user: 'saran',
    password: 'KMWQHTQSRBPRVJDU',
    database: 'salemanagement',
});

async function main() {
    await client.connect();
    
    // 1. Check transfer items vs destination stock for the transfer
    const tfId = '90bc3993-4f85-417a-befb-99c2e1708f28';
    const toChannelId = (await client.query(`SELECT to_channel_id FROM stock_transfers WHERE id = $1`, [tfId])).rows[0].to_channel_id;
    
    console.log(`Transfer ID: ${tfId}`);
    console.log(`To Channel ID: ${toChannelId}\n`);
    
    // 2. Check: items where receivedQuantity != quantity (sent)
    const { rows: diffs } = await client.query(`
        SELECT 
            sti.barcode,
            p.name,
            p.size,
            p.color,
            sti.quantity AS sent_qty,
            sti.received_quantity AS received_qty,
            (sti.quantity - sti.received_quantity) AS diff
        FROM stock_transfer_items sti
        JOIN products p ON p.barcode = sti.barcode
        WHERE sti.stock_transfer_id = $1
          AND sti.quantity != sti.received_quantity
        ORDER BY (sti.quantity - sti.received_quantity) DESC
    `, [tfId]);
    
    console.log(`=== รายการที่ส่ง != รับ ===`);
    console.log(`พบ ${diffs.length} รายการ`);
    console.table(diffs);
    
    // 3. Total sent vs total received
    const { rows: totals } = await client.query(`
        SELECT 
            SUM(quantity) AS total_sent,
            SUM(received_quantity) AS total_received,
            SUM(quantity) - SUM(received_quantity) AS diff
        FROM stock_transfer_items 
        WHERE stock_transfer_id = $1
    `, [tfId]);
    
    console.log('\n=== สรุปยอดรวม ===');
    console.table(totals);
    
    // 4. Check all channels for any returnedQuantity > 0 (to understand where returns happened)
    const { rows: allReturned } = await client.query(`
        SELECT 
            cs.barcode, p.name, p.size, p.color,
            sc.name AS channel_name,
            cs.quantity, cs.sold_quantity, cs.returned_quantity,
            (cs.quantity - cs.sold_quantity - cs.returned_quantity) AS correct_remaining
        FROM channel_stock cs
        JOIN products p ON p.barcode = cs.barcode
        JOIN sales_channels sc ON sc.id = cs.channel_id
        WHERE cs.returned_quantity > 0
        ORDER BY cs.returned_quantity DESC
        LIMIT 20
    `);
    
    console.log('\n=== สินค้าที่มี returnedQuantity > 0 (ทุก Channel) ===');
    console.table(allReturned);
    
    await client.end();
}

main().catch(console.error);
