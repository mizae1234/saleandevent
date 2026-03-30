import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const CATEGORIES = [
  "กางเกงยีนส์",
  "กางเกงขาสั้น",
  "เสื้อ",
  "กระเป๋า",
  "เข็มขัด",
  "Display",
  "Supplies",
  "อุปกรณ์",
  "อื่นๆ",
];

async function main() {
  console.log('Start seeding product categories...')
  
  for (let i = 0; i < CATEGORIES.length; i++) {
    const categoryName = CATEGORIES[i]
    
    await prisma.productCategory.upsert({
      where: { name: categoryName },
      update: {
        sortOrder: i * 10
      },
      create: {
        name: categoryName,
        sortOrder: i * 10,
        isActive: true
      }
    })
    console.log(`Upserted category: ${categoryName}`)
  }
  
  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
