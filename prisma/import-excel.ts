/**
 * Import Staff (3 Excel files) + Customer (1 Excel file) into PostgreSQL
 * 
 * Usage: npx tsx prisma/import-excel.ts
 * 
 * Password = DOB format ddMMyyyy (e.g. "24092516")
 * Default DOB for missing = 01/01/2026 → password "01012569" (พ.ศ.)
 */

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'
import * as bcrypt from 'bcryptjs'
import { format } from 'date-fns'
import * as path from 'path'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString, max: 5 })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ============ HELPERS ============

async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10)
}

async function generateStaffCode(): Promise<string> {
    const lastStaff = await prisma.staff.findFirst({
        where: { code: { not: null, startsWith: 'S' } },
        orderBy: { code: 'desc' },
        select: { code: true }
    })
    if (!lastStaff?.code) return 'S0001'
    const lastNumber = parseInt(lastStaff.code.replace('S', ''), 10)
    return `S${(lastNumber + 1).toString().padStart(4, '0')}`
}

// Track running code counter
let currentCodeNumber = 0

async function getNextStaffCode(): Promise<string> {
    if (currentCodeNumber === 0) {
        const lastStaff = await prisma.staff.findFirst({
            where: { code: { not: null, startsWith: 'S' } },
            orderBy: { code: 'desc' },
            select: { code: true }
        })
        currentCodeNumber = lastStaff?.code
            ? parseInt(lastStaff.code.replace('S', ''), 10)
            : 0
    }
    currentCodeNumber++
    return `S${currentCodeNumber.toString().padStart(4, '0')}`
}

function parseDateDMY(raw: string | null | undefined): Date | null {
    if (!raw || typeof raw !== 'string') return null
    // format "dd-mm-yyyy" or "dd/mm/yyyy"
    const parts = raw.replace(/\//g, '-').split('-')
    if (parts.length !== 3) return null
    const [d, m, y] = parts.map(Number)
    if (!d || !m || !y) return null
    // Convert Buddhist year to Christian year if > 2400
    const year = y > 2400 ? y - 543 : y
    return new Date(year, m - 1, d)
}

function dobToPassword(dob: Date): string {
    // format ddMMyyyy (Buddhist year)
    const d = dob.getDate().toString().padStart(2, '0')
    const m = (dob.getMonth() + 1).toString().padStart(2, '0')
    const y = (dob.getFullYear() + 543).toString() // Convert to พ.ศ.
    return `${d}${m}${y}`
}

const DEFAULT_DOB = new Date(2026, 0, 1) // 01/01/2026

function parseCreditTerm(raw: string | number | null): number {
    if (!raw) return 0
    const str = String(raw).replace(/[^\d]/g, '')
    return parseInt(str, 10) || 0
}

function parseGP(raw: string | number | null): number {
    if (!raw) return 0
    if (typeof raw === 'number') return Math.round(raw * 100) // 0.26 → 26
    // Handle string like "24% เคาท์เตอร์ 25% ลานโปร" → take first number
    const match = String(raw).match(/[\d.]+/)
    if (!match) return 0
    const val = parseFloat(match[0])
    return val < 1 ? Math.round(val * 100) : val
}

// ============ IMPORT STAFF ============

async function importOfficeStaff() {
    console.log('\n📋 Importing Office Staff (พนักงานบัญชี)...')
    const wb = XLSX.readFile(path.join(__dirname, 'พนักงานบัญชี.xlsx'))
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as unknown[][]

    let count = 0
    for (const row of data) {
        const idx = row[0]
        if (typeof idx !== 'number') continue // skip headers

        const name = String(row[1] || '').trim()
        const dobRaw = row[2] as string | null
        const position = row[3] ? String(row[3]).trim() : null
        const salary = Number(row[4]) || 0
        const bankAccountNo = row[5] ? String(row[5]).trim() : null

        if (!name) continue

        const dob = parseDateDMY(dobRaw) || DEFAULT_DOB
        const password = dobToPassword(dob)
        const hash = await hashPassword(password)
        const code = await getNextStaffCode()

        // Determine role based on position
        let role = 'STAFF'
        if (position === 'ผู้จัดการ') role = 'MANAGER'
        else if (position === 'HR') role = 'ADMIN'
        else if (position === 'บัญชี') role = 'FINANCE'

        await prisma.staff.create({
            data: {
                code,
                name,
                role,
                position,
                dateOfBirth: dob,
                paymentType: 'monthly',
                dailyRate: salary, // store salary in dailyRate for monthly
                bankAccountNo,
                passwordHash: hash,
                status: 'active',
            }
        })

        console.log(`  ✅ ${code} | ${name} | ${role} | pwd: ${password}`)
        count++
    }
    console.log(`  → Imported ${count} office staff`)
}

async function importWarehouseStaff() {
    console.log('\n📦 Importing Warehouse Staff (พนักงานโกดัง)...')
    const wb = XLSX.readFile(path.join(__dirname, 'พนักงานโกดัง.xlsx'))
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as unknown[][]

    let count = 0
    for (const row of data) {
        const idx = row[0]
        if (typeof idx !== 'number') continue

        const name = String(row[1] || '').trim()
        const position = row[3] ? String(row[3]).trim() : null
        const salary = Number(row[4]) || 0
        const bankAccountNo = row[9] ? String(row[9]).trim() : null

        if (!name) continue

        // No DOB in warehouse file → use default
        const dob = DEFAULT_DOB
        const password = dobToPassword(dob)
        const hash = await hashPassword(password)
        const code = await getNextStaffCode()

        await prisma.staff.create({
            data: {
                code,
                name,
                role: 'WAREHOUSE',
                position,
                dateOfBirth: dob,
                paymentType: 'monthly',
                dailyRate: salary,
                bankAccountNo,
                passwordHash: hash,
                status: 'active',
            }
        })

        console.log(`  ✅ ${code} | ${name} | WAREHOUSE | pwd: ${password}`)
        count++
    }
    console.log(`  → Imported ${count} warehouse staff`)
}

async function importPCStaff() {
    console.log('\n🛍️  Importing PC Staff (พยักงาน PC)...')
    const wb = XLSX.readFile(path.join(__dirname, 'พยักงาน_pc.xlsx'))
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as unknown[][]

    let count = 0
    for (const row of data) {
        const idx = row[0]
        if (typeof idx !== 'number') continue

        const dobRaw = row[1] as string | null
        const name = String(row[2] || '').trim()
        const dailyRate = Number(row[3]) || 0
        const bankName = row[5] ? String(row[5]).trim() : null
        const bankAccountNo = row[6] ? String(row[6]).trim() : null

        if (!name) continue

        const dob = parseDateDMY(dobRaw) || DEFAULT_DOB
        const password = dobToPassword(dob)
        const hash = await hashPassword(password)
        const code = await getNextStaffCode()

        await prisma.staff.create({
            data: {
                code,
                name,
                role: 'STAFF',
                position: 'PC',
                dateOfBirth: dob,
                paymentType: 'daily',
                dailyRate,
                bankName,
                bankAccountNo,
                passwordHash: hash,
                status: 'active',
            }
        })

        console.log(`  ✅ ${code} | ${name} | PC | ฿${dailyRate}/day | pwd: ${password}`)
        count++
    }
    console.log(`  → Imported ${count} PC staff`)
}

// ============ IMPORT CUSTOMERS ============

async function importCustomers() {
    console.log('\n👥 Importing Customers (ข้อมูลลูกค้า)...')
    const wb = XLSX.readFile(path.join(__dirname, 'ข้อมูลลูกค้า.xlsx'))
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as unknown[][]

    let count = 0
    for (let i = 1; i < data.length; i++) { // skip header row 0
        const row = data[i]
        if (!row || !row[0] || !row[1]) continue

        const code = String(row[0]).trim()
        const name = String(row[1]).trim()
        const referenceNo = row[2] ? String(row[2]).trim() : null  // สาขา
        const address = row[3] ? String(row[3]).trim() : null
        const taxId = row[4] ? String(row[4]).trim() : null
        const creditTerm = parseCreditTerm(row[5] as string)
        const discountPercent = parseGP(row[6] as string | number)

        await prisma.customer.create({
            data: {
                code,
                name,
                taxId,
                address,
                referenceNo,
                creditTerm,
                discountPercent,
                status: 'active',
            }
        })

        count++
    }
    console.log(`  → Imported ${count} customers`)
}

// ============ MAIN ============

async function main() {
    console.log('🚀 Starting Excel Import...')
    console.log(`📍 Database: ${connectionString?.replace(/:[^:@]+@/, ':***@')}`)

    // Import Staff (3 files)
    await importOfficeStaff()
    await importWarehouseStaff()
    await importPCStaff()

    // Import Customers
    await importCustomers()

    console.log('\n🎉 Import complete!')
}

main()
    .catch((e) => {
        console.error('❌ Import failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
        await pool.end()
    })
