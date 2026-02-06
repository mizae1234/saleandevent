import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString = process.env.DATABASE_URL

const pool = new Pool({ connectionString, max: 5 }) // Limit pool size
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ข้อมูล Master Stock จากภาพ
// Schema: barcode (PK), code, name, size, price, category, status
const products = [
    // รหัส 5001 ซีรีส์
    { barcode: "5001-FREE-ดำ", code: "5001", name: "กางเกงยีนส์ 5001", size: "FREE", price: 350, category: "กางเกงยีนส์", status: "active" },

    // รหัส 5002 ซีรีส์
    { barcode: "5002-FREE-กรม", code: "5002", name: "กางเกงยีนส์ 5002", size: "FREE", price: 350, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5002-FREE-ดำ", code: "5002", name: "กางเกงยีนส์ 5002", size: "FREE", price: 350, category: "กางเกงยีนส์", status: "active" },

    // รหัส 5005 ซีรีส์
    { barcode: "5005-FREE-กรม", code: "5005", name: "กางเกงยีนส์ 5005", size: "FREE", price: 350, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5005-FREE-ดำ", code: "5005", name: "กางเกงยีนส์ 5005", size: "FREE", price: 350, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5005-FREE-ยีนส์", code: "5005", name: "กางเกงยีนส์ 5005", size: "FREE", price: 350, category: "กางเกงยีนส์", status: "active" },

    // รหัส 5RK1 ซีรีส์
    { barcode: "5RK1-27-ดำ", code: "5RK1", name: "กางเกงยีนส์ 5RK1", size: "27", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5RK1-28-ดำ", code: "5RK1", name: "กางเกงยีนส์ 5RK1", size: "28", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5RK1-29-ดำ", code: "5RK1", name: "กางเกงยีนส์ 5RK1", size: "29", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5RK1-30-ดำ", code: "5RK1", name: "กางเกงยีนส์ 5RK1", size: "30", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5RK1-31-ดำ", code: "5RK1", name: "กางเกงยีนส์ 5RK1", size: "31", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5RK1-32-ดำ", code: "5RK1", name: "กางเกงยีนส์ 5RK1", size: "32", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5RK1-33-ดำ", code: "5RK1", name: "กางเกงยีนส์ 5RK1", size: "33", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5RK1-34-ดำ", code: "5RK1", name: "กางเกงยีนส์ 5RK1", size: "34", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5RK1-36-ดำ", code: "5RK1", name: "กางเกงยีนส์ 5RK1", size: "36", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5RK1-38-ดำ", code: "5RK1", name: "กางเกงยีนส์ 5RK1", size: "38", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5RK1-40-ดำ", code: "5RK1", name: "กางเกงยีนส์ 5RK1", size: "40", price: 450, category: "กางเกงยีนส์", status: "active" },

    // รหัส 5RK1-2 ซีรีส์ (กรม)
    { barcode: "5RK1-2-27-กรม", code: "5RK1-2", name: "กางเกงยีนส์ 5RK1-2", size: "27", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5RK1-2-28-กรม", code: "5RK1-2", name: "กางเกงยีนส์ 5RK1-2", size: "28", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5RK1-2-29-กรม", code: "5RK1-2", name: "กางเกงยีนส์ 5RK1-2", size: "29", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5RK1-2-30-กรม", code: "5RK1-2", name: "กางเกงยีนส์ 5RK1-2", size: "30", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5RK1-2-31-กรม", code: "5RK1-2", name: "กางเกงยีนส์ 5RK1-2", size: "31", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5RK1-2-32-กรม", code: "5RK1-2", name: "กางเกงยีนส์ 5RK1-2", size: "32", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5RK1-2-33-กรม", code: "5RK1-2", name: "กางเกงยีนส์ 5RK1-2", size: "33", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5RK1-2-34-กรม", code: "5RK1-2", name: "กางเกงยีนส์ 5RK1-2", size: "34", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5RK1-2-36-กรม", code: "5RK1-2", name: "กางเกงยีนส์ 5RK1-2", size: "36", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5RK1-2-38-กรม", code: "5RK1-2", name: "กางเกงยีนส์ 5RK1-2", size: "38", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5RK1-2-40-กรม", code: "5RK1-2", name: "กางเกงยีนส์ 5RK1-2", size: "40", price: 450, category: "กางเกงยีนส์", status: "active" },

    // รหัส 5007 ซีรีส์
    { barcode: "5007-XL-ดำ", code: "5007", name: "กางเกงยีนส์ 5007", size: "XL", price: 550, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5007-2XL-ดำ", code: "5007", name: "กางเกงยีนส์ 5007", size: "2XL", price: 550, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5007-3XL-ดำ", code: "5007", name: "กางเกงยีนส์ 5007", size: "3XL", price: 550, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5007-4XL-ดำ", code: "5007", name: "กางเกงยีนส์ 5007", size: "4XL", price: 550, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5007-5XL-ดำ", code: "5007", name: "กางเกงยีนส์ 5007", size: "5XL", price: 550, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5007-6XL-ดำ", code: "5007", name: "กางเกงยีนส์ 5007", size: "6XL", price: 550, category: "กางเกงยีนส์", status: "active" },

    // รหัส 5950 ซีรีส์
    { barcode: "5950-XL-ดำ", code: "5950", name: "กางเกงยีนส์ 5950", size: "XL", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5950-2XL-ดำ", code: "5950", name: "กางเกงยีนส์ 5950", size: "2XL", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5950-3XL-ดำ", code: "5950", name: "กางเกงยีนส์ 5950", size: "3XL", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5950-4XL-ดำ", code: "5950", name: "กางเกงยีนส์ 5950", size: "4XL", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5950-5XL-ดำ", code: "5950", name: "กางเกงยีนส์ 5950", size: "5XL", price: 450, category: "กางเกงยีนส์", status: "active" },
    { barcode: "5950-6XL-ดำ", code: "5950", name: "กางเกงยีนส์ 5950", size: "6XL", price: 450, category: "กางเกงยีนส์", status: "active" },

    // รหัส S911-1 ซีรีส์
    { barcode: "S911-1-S-กรม", code: "S911-1", name: "กางเกงยีนส์ S911-1", size: "S", price: 590, category: "กางเกงยีนส์", status: "active" },
    { barcode: "S911-1-M-กรม", code: "S911-1", name: "กางเกงยีนส์ S911-1", size: "M", price: 590, category: "กางเกงยีนส์", status: "active" },
    { barcode: "S911-1-L-กรม", code: "S911-1", name: "กางเกงยีนส์ S911-1", size: "L", price: 590, category: "กางเกงยีนส์", status: "active" },
    { barcode: "S911-1-XL-กรม", code: "S911-1", name: "กางเกงยีนส์ S911-1", size: "XL", price: 590, category: "กางเกงยีนส์", status: "active" },

    // รหัส S912-1 ซีรีส์
    { barcode: "S912-1-S-ดำ", code: "S912-1", name: "กางเกงยีนส์ S912-1", size: "S", price: 590, category: "กางเกงยีนส์", status: "active" },
    { barcode: "S912-1-M-ดำ", code: "S912-1", name: "กางเกงยีนส์ S912-1", size: "M", price: 590, category: "กางเกงยีนส์", status: "active" },
    { barcode: "S912-1-L-ดำ", code: "S912-1", name: "กางเกงยีนส์ S912-1", size: "L", price: 590, category: "กางเกงยีนส์", status: "active" },
    { barcode: "S912-1-XL-ดำ", code: "S912-1", name: "กางเกงยีนส์ S912-1", size: "XL", price: 590, category: "กางเกงยีนส์", status: "active" },

    // รหัส S912-2 ซีรีส์
    { barcode: "S912-2-S-กรม", code: "S912-2", name: "กางเกงยีนส์ S912-2", size: "S", price: 590, category: "กางเกงยีนส์", status: "active" },
    { barcode: "S912-2-M-กรม", code: "S912-2", name: "กางเกงยีนส์ S912-2", size: "M", price: 590, category: "กางเกงยีนส์", status: "active" },
    { barcode: "S912-2-L-กรม", code: "S912-2", name: "กางเกงยีนส์ S912-2", size: "L", price: 590, category: "กางเกงยีนส์", status: "active" },
    { barcode: "S912-2-XL-กรม", code: "S912-2", name: "กางเกงยีนส์ S912-2", size: "XL", price: 590, category: "กางเกงยีนส์", status: "active" },

    // Gex series
    { barcode: "Gex-27-ดำ", code: "Gex", name: "กางเกงยีนส์ Gex", size: "27", price: 490, category: "กางเกงยีนส์", status: "active" },
    { barcode: "Gex-28-ดำ", code: "Gex", name: "กางเกงยีนส์ Gex", size: "28", price: 490, category: "กางเกงยีนส์", status: "active" },
    { barcode: "Gex-29-ดำ", code: "Gex", name: "กางเกงยีนส์ Gex", size: "29", price: 490, category: "กางเกงยีนส์", status: "active" },
    { barcode: "Gex-30-ดำ", code: "Gex", name: "กางเกงยีนส์ Gex", size: "30", price: 490, category: "กางเกงยีนส์", status: "active" },
    { barcode: "Gex-31-ดำ", code: "Gex", name: "กางเกงยีนส์ Gex", size: "31", price: 490, category: "กางเกงยีนส์", status: "active" },
    { barcode: "Gex-32-ดำ", code: "Gex", name: "กางเกงยีนส์ Gex", size: "32", price: 490, category: "กางเกงยีนส์", status: "active" },
    { barcode: "Gex-33-ดำ", code: "Gex", name: "กางเกงยีนส์ Gex", size: "33", price: 490, category: "กางเกงยีนส์", status: "active" },
    { barcode: "Gex-34-ดำ", code: "Gex", name: "กางเกงยีนส์ Gex", size: "34", price: 490, category: "กางเกงยีนส์", status: "active" },
    { barcode: "Gex-36-ดำ", code: "Gex", name: "กางเกงยีนส์ Gex", size: "36", price: 490, category: "กางเกงยีนส์", status: "active" },

    // S510-44 series
    { barcode: "S510-44-S-ยีนส์", code: "S510-44", name: "กางเกงยีนส์ S510-44", size: "S", price: 590, category: "กางเกงยีนส์", status: "active" },
    { barcode: "S510-44-M-ยีนส์", code: "S510-44", name: "กางเกงยีนส์ S510-44", size: "M", price: 590, category: "กางเกงยีนส์", status: "active" },
    { barcode: "S510-44-L-ยีนส์", code: "S510-44", name: "กางเกงยีนส์ S510-44", size: "L", price: 590, category: "กางเกงยีนส์", status: "active" },
    { barcode: "S510-44-XL-ยีนส์", code: "S510-44", name: "กางเกงยีนส์ S510-44", size: "XL", price: 590, category: "กางเกงยีนส์", status: "active" },

    // S914 series
    { barcode: "S914-S-ดำ", code: "S914", name: "กางเกงยีนส์ S914", size: "S", price: 650, category: "กางเกงยีนส์", status: "active" },
    { barcode: "S914-M-ดำ", code: "S914", name: "กางเกงยีนส์ S914", size: "M", price: 650, category: "กางเกงยีนส์", status: "active" },
    { barcode: "S914-L-ดำ", code: "S914", name: "กางเกงยีนส์ S914", size: "L", price: 650, category: "กางเกงยีนส์", status: "active" },
    { barcode: "S914-XL-ดำ", code: "S914", name: "กางเกงยีนส์ S914", size: "XL", price: 650, category: "กางเกงยีนส์", status: "active" },

    // S916-1 series
    { barcode: "S916-1-S-ดำ", code: "S916-1", name: "กางเกงยีนส์ S916-1", size: "S", price: 650, category: "กางเกงยีนส์", status: "active" },
    { barcode: "S916-1-M-ดำ", code: "S916-1", name: "กางเกงยีนส์ S916-1", size: "M", price: 650, category: "กางเกงยีนส์", status: "active" },
    { barcode: "S916-1-L-ดำ", code: "S916-1", name: "กางเกงยีนส์ S916-1", size: "L", price: 650, category: "กางเกงยีนส์", status: "active" },
    { barcode: "S916-1-XL-ดำ", code: "S916-1", name: "กางเกงยีนส์ S916-1", size: "XL", price: 650, category: "กางเกงยีนส์", status: "active" },

    // S916-2 series
    { barcode: "S916-2-S-กรม", code: "S916-2", name: "กางเกงยีนส์ S916-2", size: "S", price: 650, category: "กางเกงยีนส์", status: "active" },
    { barcode: "S916-2-M-กรม", code: "S916-2", name: "กางเกงยีนส์ S916-2", size: "M", price: 650, category: "กางเกงยีนส์", status: "active" },
    { barcode: "S916-2-L-กรม", code: "S916-2", name: "กางเกงยีนส์ S916-2", size: "L", price: 650, category: "กางเกงยีนส์", status: "active" },
    { barcode: "S916-2-XL-กรม", code: "S916-2", name: "กางเกงยีนส์ S916-2", size: "XL", price: 650, category: "กางเกงยีนส์", status: "active" },

    // 19272 Vintage series
    { barcode: "19272-S-ฟอก", code: "19272", name: "กางเกงยีนส์ 19272 Vintage", size: "S", price: 890, category: "กางเกงยีนส์", status: "active" },
    { barcode: "19272-M-ฟอก", code: "19272", name: "กางเกงยีนส์ 19272 Vintage", size: "M", price: 890, category: "กางเกงยีนส์", status: "active" },
    { barcode: "19272-L-ฟอก", code: "19272", name: "กางเกงยีนส์ 19272 Vintage", size: "L", price: 890, category: "กางเกงยีนส์", status: "active" },
    { barcode: "19272-XL-ฟอก", code: "19272", name: "กางเกงยีนส์ 19272 Vintage", size: "XL", price: 890, category: "กางเกงยีนส์", status: "active" },

    // 19210 series
    { barcode: "19210-S-ดำ", code: "19210", name: "กางเกงยีนส์ 19210", size: "S", price: 690, category: "กางเกงยีนส์", status: "active" },
    { barcode: "19210-M-ดำ", code: "19210", name: "กางเกงยีนส์ 19210", size: "M", price: 690, category: "กางเกงยีนส์", status: "active" },
    { barcode: "19210-L-ดำ", code: "19210", name: "กางเกงยีนส์ 19210", size: "L", price: 690, category: "กางเกงยีนส์", status: "active" },
    { barcode: "19210-XL-ดำ", code: "19210", name: "กางเกงยีนส์ 19210", size: "XL", price: 690, category: "กางเกงยีนส์", status: "active" },

    // U8210 series
    { barcode: "U8210-S-กรม", code: "U8210", name: "กางเกงยีนส์ U8210", size: "S", price: 750, category: "กางเกงยีนส์", status: "active" },
    { barcode: "U8210-M-กรม", code: "U8210", name: "กางเกงยีนส์ U8210", size: "M", price: 750, category: "กางเกงยีนส์", status: "active" },
    { barcode: "U8210-L-กรม", code: "U8210", name: "กางเกงยีนส์ U8210", size: "L", price: 750, category: "กางเกงยีนส์", status: "active" },
    { barcode: "U8210-XL-กรม", code: "U8210", name: "กางเกงยีนส์ U8210", size: "XL", price: 750, category: "กางเกงยีนส์", status: "active" },

    // U8217 series
    { barcode: "U8217-S-ฟอก", code: "U8217", name: "กางเกงยีนส์ U8217", size: "S", price: 850, category: "กางเกงยีนส์", status: "active" },
    { barcode: "U8217-M-ฟอก", code: "U8217", name: "กางเกงยีนส์ U8217", size: "M", price: 850, category: "กางเกงยีนส์", status: "active" },
    { barcode: "U8217-L-ฟอก", code: "U8217", name: "กางเกงยีนส์ U8217", size: "L", price: 850, category: "กางเกงยีนส์", status: "active" },
    { barcode: "U8217-XL-ฟอก", code: "U8217", name: "กางเกงยีนส์ U8217", size: "XL", price: 850, category: "กางเกงยีนส์", status: "active" },

    // U8218 series  
    { barcode: "U8218-S-เทา", code: "U8218", name: "กางเกงยีนส์ U8218", size: "S", price: 850, category: "กางเกงยีนส์", status: "active" },
    { barcode: "U8218-M-เทา", code: "U8218", name: "กางเกงยีนส์ U8218", size: "M", price: 850, category: "กางเกงยีนส์", status: "active" },
    { barcode: "U8218-L-เทา", code: "U8218", name: "กางเกงยีนส์ U8218", size: "L", price: 850, category: "กางเกงยีนส์", status: "active" },
    { barcode: "U8218-XL-เทา", code: "U8218", name: "กางเกงยีนส์ U8218", size: "XL", price: 850, category: "กางเกงยีนส์", status: "active" },

    // 50244 series
    { barcode: "50244-1-S-ดำ", code: "50244-1", name: "กางเกงยีนส์ 50244-1", size: "S", price: 990, category: "กางเกงยีนส์", status: "active" },
    { barcode: "50244-1-M-ดำ", code: "50244-1", name: "กางเกงยีนส์ 50244-1", size: "M", price: 990, category: "กางเกงยีนส์", status: "active" },
    { barcode: "50244-1-L-ดำ", code: "50244-1", name: "กางเกงยีนส์ 50244-1", size: "L", price: 990, category: "กางเกงยีนส์", status: "active" },
    { barcode: "50244-1-XL-ดำ", code: "50244-1", name: "กางเกงยีนส์ 50244-1", size: "XL", price: 990, category: "กางเกงยีนส์", status: "active" },

    { barcode: "50244-2-S-กรม", code: "50244-2", name: "กางเกงยีนส์ 50244-2", size: "S", price: 990, category: "กางเกงยีนส์", status: "active" },
    { barcode: "50244-2-M-กรม", code: "50244-2", name: "กางเกงยีนส์ 50244-2", size: "M", price: 990, category: "กางเกงยีนส์", status: "active" },
    { barcode: "50244-2-L-กรม", code: "50244-2", name: "กางเกงยีนส์ 50244-2", size: "L", price: 990, category: "กางเกงยีนส์", status: "active" },
    { barcode: "50244-2-XL-กรม", code: "50244-2", name: "กางเกงยีนส์ 50244-2", size: "XL", price: 990, category: "กางเกงยีนส์", status: "active" },

    // 50266 series
    { barcode: "50266-1-S-ดำ", code: "50266-1", name: "กางเกงยีนส์ 50266-1", size: "S", price: 1090, category: "กางเกงยีนส์", status: "active" },
    { barcode: "50266-1-M-ดำ", code: "50266-1", name: "กางเกงยีนส์ 50266-1", size: "M", price: 1090, category: "กางเกงยีนส์", status: "active" },
    { barcode: "50266-1-L-ดำ", code: "50266-1", name: "กางเกงยีนส์ 50266-1", size: "L", price: 1090, category: "กางเกงยีนส์", status: "active" },
    { barcode: "50266-1-XL-ดำ", code: "50266-1", name: "กางเกงยีนส์ 50266-1", size: "XL", price: 1090, category: "กางเกงยีนส์", status: "active" },

    { barcode: "50266-2-S-กรม", code: "50266-2", name: "กางเกงยีนส์ 50266-2", size: "S", price: 1090, category: "กางเกงยีนส์", status: "active" },
    { barcode: "50266-2-M-กรม", code: "50266-2", name: "กางเกงยีนส์ 50266-2", size: "M", price: 1090, category: "กางเกงยีนส์", status: "active" },
    { barcode: "50266-2-L-กรม", code: "50266-2", name: "กางเกงยีนส์ 50266-2", size: "L", price: 1090, category: "กางเกงยีนส์", status: "active" },
    { barcode: "50266-2-XL-กรม", code: "50266-2", name: "กางเกงยีนส์ 50266-2", size: "XL", price: 1090, category: "กางเกงยีนส์", status: "active" },
]

async function main() {
    console.log('🌱 Seeding products with createMany...')

    try {
        // Delete existing products first
        await prisma.product.deleteMany({})
        console.log('✅ Cleared existing products')

        // Use createMany for batch insert
        const result = await prisma.product.createMany({
            data: products,
            skipDuplicates: true,
        })

        console.log(`✅ Successfully seeded ${result.count} products`)
    } catch (error) {
        console.error('❌ Failed to seed products:', error)
        throw error
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
        await pool.end()
    })
