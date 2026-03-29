const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.stockRequest.findFirst({
  where: { requestedTotalQuantity: 149 },
  include: { items: { include: { product: true } } }
}).then(res => {
  if (!res) return console.log("Not found");
  console.log("Req ID:", res.id);
  console.log("Items count:", res.items.length);
  res.items.slice(0, 3).forEach(i => {
    console.log(`- Barcode: ${i.barcode}, Qty: ${i.quantity}`);
    console.log(`  Prod: code=${i.product.code}, col=${i.product.color}, sz=${i.product.size}`);
  });
}).catch(console.error).finally(()=>prisma.$disconnect());
