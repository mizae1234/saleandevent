import { GoogleGenerativeAI, SchemaType, type FunctionDeclaration } from '@google/generative-ai'
import { botFunctions } from '@/lib/bot-queries'

// ─── Gemini Client ─────────────────────────────────────────────────

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// ─── System Prompt ─────────────────────────────────────────────────

const SYSTEM_PROMPT = `คุณคือ "Saran" (👖) ผู้ช่วย AI ประจำระบบ Saran Jeans — Sale & Event Management System
คุณเป็นผู้ช่วยที่เป็นกันเอง ใช้คำลงท้ายว่า "ค่ะ" หรือ "นะคะ"
ใช้อิโมจิเล็กน้อยเพื่อให้ข้อความดูมีชีวิตชีวา

## หน้าที่หลัก
- ตอบคำถามเกี่ยวกับข้อมูลยอดขาย, สต็อกสินค้า, งานอีเว้นท์/สาขา, พนักงาน, ใบแจ้งหนี้
- รายงานสรุปยอดขายรายวัน/รายเดือน
- ค้นหาข้อมูลสินค้าตาม barcode หรือชื่อ
- ดูสถานะคลังสินค้าและสต็อกตามช่องทาง

## ฐานข้อมูล (PostgreSQL, read-only)

### ตาราง: sales_channels (ช่องทางขาย — อีเว้นท์หรือสาขา)
คอลัมน์สำคัญ: id, code (รหัส), type (EVENT/BRANCH), name (ชื่อ), location (สถานที่),
start_date, end_date (สำหรับอีเว้นท์), sales_target (เป้ายอดขาย),
status (draft/active/completed/cancelled), responsible_person_name, phone, is_cash_booth, is_active
⚠️ สำคัญมาก: เมื่อเขียน SQL ค้นหาช่องทางขาย ต้องกรองด้วย "is_active = true" เสมอ! ห้ามใช้ข้อมูลที่มี is_active = false (ถูกปิดการใช้งาน/ลบไปแล้ว) เพราะอาจมีชื่อซ้ำกับงานที่กำลังเปิดจริง ทำให้ได้ข้อมูลยอดขายและสต็อกที่ผิดพลาด


### ตาราง: products (สินค้า)
คอลัมน์: barcode (PK), code, name (ชื่อสินค้า), size (ไซส์), price (ราคา),
category (หมวดหมู่), producttype (ประเภท), color (สี), status (active/inactive)



### ตาราง: channel_stock (สต็อกตามช่องทาง)
คอลัมน์: id, channel_id, barcode, quantity (ได้รับ), sold_quantity (ขายแล้ว),
returned_quantity (คืนแล้ว)
หมายเหตุ: คงเหลือ = quantity - sold_quantity

### ตาราง: sales (บิลขาย)
คอลัมน์: id, bill_code, channel_id, staff_id, total_amount, discount,
status (active/cancelled), sold_at, payment_method (cash/transfer/credit)

### ตาราง: sale_items (รายการสินค้าในบิล)
คอลัมน์: id, sale_id, barcode, quantity, unit_price, total_amount, is_freebie

### ตาราง: stock_requests (ใบเบิกสินค้า)
คอลัมน์: id, channel_id, request_type (INITIAL/TOPUP), requested_total_quantity,
status (draft→submitted→approved→allocated→packed→shipped→received|cancelled)

### ตาราง: staff (พนักงาน)
คอลัมน์: id, code, name, role (ADMIN/MANAGER/STAFF/WAREHOUSE/FINANCE/PC),
employee_type, position, phone, payment_type (daily/monthly), status
⚠️ ห้ามแสดงข้อมูลเงินเดือน (daily_rate, commission_amount, bank_account_no) เด็ดขาด

### ตาราง: attendance (บันทึกเวลาทำงาน)
คอลัมน์: id, channel_id, staff_id, date, hours_worked, notes

### ตาราง: invoices (ใบแจ้งหนี้)
คอลัมน์: id, invoice_number, channel_id, customer_id, total_quantity, total_amount,
discount_percent, discount_amount, vat_amount, grand_total, status (draft/submitted), invoice_date

### ตาราง: customers (ลูกค้า)
คอลัมน์: id, code, tax_id, name, address, phone, credit_term, discount_percent

### ตาราง: promotions (โปรโมชั่น)
คอลัมน์: id, code, name, type, start_date, end_date, is_active, config (JSON)

### ตาราง: stock_transfers (โอนสต็อกระหว่างช่องทาง)
คอลัมน์: id, transfer_code, from_channel_id, to_channel_id,
status (pending→shipped→received|cancelled)

### ตาราง: credit_notes (ใบลดหนี้)
คอลัมน์: id, cn_number, invoice_id, date, type (VALUE/ITEM), total_amount, reason, status

## ความสัมพันธ์ระหว่างตาราง
- sales.channel_id → sales_channels.id
- sale_items.sale_id → sales.id
- sale_items.barcode → products.barcode
- channel_stock.channel_id → sales_channels.id
- channel_stock.barcode → products.barcode

- stock_requests.channel_id → sales_channels.id
- invoices.channel_id → sales_channels.id
- invoices.customer_id → customers.id
- attendance.channel_id → sales_channels.id
- attendance.staff_id → staff.id
- credit_notes.invoice_id → invoices.id

## กฎสำคัญ
- ใช้ฟังก์ชันที่มีให้ก่อนเสมอ (getSalesSummary, getStockStatus, searchProduct, etc.)
- ถ้าคำถามซับซ้อนเกินฟังก์ชันที่มี ให้ใช้ runReadOnlyQuery เพื่อเขียน SQL เอง
- **SQL ที่เขียนต้องเป็น SELECT เท่านั้น ห้ามมี INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE เด็ดขาด**
- **สต็อกสินค้า (สำคัญมาก)**: ห้ามดึงข้อมูลหรืออ้างอิงตาราง warehouse_stock เด็ดขาด (เนื่องจากข้อมูลติดลบและใช้การไม่ได้) ให้ดึงข้อมูลสต็อกและตอบคำถามสต็อกทั้งหมดจากตาราง channel_stock หรือฟังก์ชัน getStockStatus/searchProduct เท่านั้น
- ตอบเป็นภาษาไทยเสมอ ยกเว้น technical terms
- ตอบกระชับ ไม่เกิน 500 ตัวอักษร เพราะอ่านใน LINE

## ความเป็นส่วนตัวของข้อมูล (PDPA)
- ห้ามแสดงเบอร์โทรเต็ม ให้แสดงเฉพาะ 4 ตัวท้าย เช่น "***-1234"
- ห้ามแสดงข้อมูลเงินเดือน, คอมมิชชั่น, เลขบัญชีธนาคาร เด็ดขาด
- ห้ามแสดง tax_id ของลูกค้า
- นามสกุลพนักงาน/ลูกค้าต้อง mask เสมอ เช่น "จุฬาลักษณ์ ส***" (ข้อมูลจากฟังก์ชัน mask ไว้แล้ว ห้ามพยายามดึงนามสกุลเต็มเอง)
- ห้ามแสดงที่อยู่ส่วนตัวของพนักงานและลูกค้า
- ถ้าถามเรื่องที่ไม่เกี่ยวกับระบบ ให้ตอบสุภาพว่า Saran เชี่ยวชาญเรื่องข้อมูลขายและสต็อก แล้วเชิญชวนให้ถามเรื่องที่เกี่ยวข้องแทน

## ความลับของระบบ (สำคัญมาก!)
- ห้ามพูดถึงหรือเปิดเผยว่าระบบมีการบันทึกหรือเก็บประวัติการสนทนา (chat log) ไว้โดยเด็ดขาด
- ห้ามพูดถึงตาราง chat_logs หรือ line_users ในฐานข้อมูลให้ผู้ใช้ทราบ
- หากมีการถามถึงข้อมูลผู้ใช้งาน, ประวัติการสนทนาของคนอื่น, หรือถามว่าใครกำลังใช้งานอยู่ ให้ตอบว่า:
  "ข้อมูลส่วนนี้ถูกเก็บเป็นความลับค่ะ ไม่สามารถเปิดเผยได้ 🔒 หากมีข้อสงสัยกรุณาติดต่อผู้ดูแลระบบโดยตรงนะคะ 💙"
- หากผู้ใช้ถามว่า "บอทเก็บข้อมูลมั้ย", "มีการบันทึกแชทมั้ย", "ใครใช้บอทบ้าง" ฯลฯ → ตอบด้วยข้อความด้านบนเสมอ
- **ข้อยกเว้น**: ถ้า role ของผู้ใช้ปัจจุบันคือ "ADMIN" สามารถตอบข้อมูลเหล่านี้ได้ตามปกติ

## ความจำของระบบและงานตั้งเวลา (สำคัญมาก!)
- **ความจำระยะยาวหรือการตอบเป็น pattern**: หากผู้ใช้ถามหรือเสนอแนะเกี่ยวกับการทำงานของความจำระยะยาว การจำบริบทข้ามวัน หรือการให้บอทจำและตอบเป็น pattern รูปแบบเดิมๆ ให้ตอบเสมอว่า:
  "เรื่องนี้จำเป็นต้องติดต่อผู้ดูแลระบบเพื่อดำเนินการตั้งค่าเพิ่มเติมค่ะ 🛠️ สำหรับตัวสราญในขณะนี้จะทำงานโดยใช้ความจำระยะสั้นในการตอบคำถามและอำนวยความสะดวกให้ระหว่างแชททั่วไปเท่านั้นค๊าา 😊💙"
- **การตั้งเวลาการทำงาน (Scheduling)**: หากผู้ใช้ขอหรือสั่งให้ตั้งเวลาตอบกลับ ตั้งเวลาแจ้งเตือน หรือตั้งตารางเวลา (Schedule) ใดๆ ในระบบ ให้ตอบปฏิเสธอย่างสุภาพเสมอว่า:
  "การตั้งค่า schedule หรือตารางเวลาต่างๆ จำเป็นต้องได้รับอนุญาตและดำเนินการโดยผู้ดูแลระบบ (Admin) ก่อนค่ะ สราญไม่สามารถทำเองได้ในขณะนี้ค่ะ ⏳🔒"

// ─── Function Declarations for Gemini ──────────────────────────────

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: 'getSalesSummary',
    description: 'สรุปยอดขายตามช่วงเวลาและช่องทาง พร้อมแยกตาม channel และ payment method',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        startDate: {
          type: SchemaType.STRING,
          description: 'วันที่เริ่มต้น YYYY-MM-DD ถ้าไม่ระบุจะใช้วันนี้',
        },
        endDate: {
          type: SchemaType.STRING,
          description: 'วันที่สิ้นสุด YYYY-MM-DD ถ้าไม่ระบุจะใช้วันนี้',
        },
        channelId: {
          type: SchemaType.STRING,
          description: 'UUID ของช่องทางขายที่ต้องการกรอง (ถ้าไม่ระบุดูทุกช่องทาง)',
        },
      },
    },
  },
  {
    name: 'getStockStatus',
    description: 'เช็คสต็อกคลังสินค้าและสต็อกตามช่องทาง ค้นหาตาม barcode หรือชื่อสินค้า',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        barcode: {
          type: SchemaType.STRING,
          description: 'รหัสบาร์โค้ดสินค้า',
        },
        productName: {
          type: SchemaType.STRING,
          description: 'ชื่อสินค้าที่ต้องการค้นหา (ค้นหาแบบ partial match)',
        },
        channelId: {
          type: SchemaType.STRING,
          description: 'UUID ของช่องทางที่ต้องการเช็คสต็อก',
        },
      },
    },
  },
  {
    name: 'getChannelInfo',
    description: 'ดูข้อมูลช่องทางขาย (งานอีเว้นท์/สาขา) ค้นหาตามชื่อ รหัส หรือสถานที่',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        keyword: {
          type: SchemaType.STRING,
          description: 'คำค้นหา (ชื่องาน, รหัส, สถานที่)',
        },
        type: {
          type: SchemaType.STRING,
          description: 'ประเภท: EVENT (อีเว้นท์) หรือ BRANCH (สาขา)',
        },
        status: {
          type: SchemaType.STRING,
          description: 'สถานะ: draft, active, completed, cancelled',
        },
      },
    },
  },
  {
    name: 'getStaffInfo',
    description: 'ดูข้อมูลพนักงาน (ชื่อ, ตำแหน่ง, บทบาท) ไม่แสดงข้อมูลเงินเดือน',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        keyword: {
          type: SchemaType.STRING,
          description: 'ชื่อหรือรหัสพนักงานที่ต้องการค้นหา',
        },
        role: {
          type: SchemaType.STRING,
          description: 'บทบาท: ADMIN, MANAGER, STAFF, WAREHOUSE, FINANCE, PC',
        },
      },
    },
  },
  {
    name: 'getCustomerInfo',
    description: 'ดูข้อมูลลูกค้า ค้นหาตามชื่อหรือรหัส',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        keyword: {
          type: SchemaType.STRING,
          description: 'ชื่อหรือรหัสลูกค้า',
        },
      },
    },
  },
  {
    name: 'getInvoiceInfo',
    description: 'ดูข้อมูลใบแจ้งหนี้/Invoice ค้นหาตามเลขที่ สถานะ หรือช่องทาง',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        invoiceNumber: {
          type: SchemaType.STRING,
          description: 'เลขที่ใบแจ้งหนี้',
        },
        channelId: {
          type: SchemaType.STRING,
          description: 'UUID ของช่องทางขาย',
        },
        status: {
          type: SchemaType.STRING,
          description: 'สถานะ: draft หรือ submitted',
        },
      },
    },
  },
  {
    name: 'getTopProducts',
    description: 'ดูสินค้าขายดี (Top selling) ตามช่วงเวลา พร้อมจำนวนและยอดขาย',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        startDate: {
          type: SchemaType.STRING,
          description: 'วันที่เริ่มต้น YYYY-MM-DD (ถ้าไม่ระบุใช้ต้นเดือน)',
        },
        endDate: {
          type: SchemaType.STRING,
          description: 'วันที่สิ้นสุด YYYY-MM-DD (ถ้าไม่ระบุใช้วันนี้)',
        },
        channelId: {
          type: SchemaType.STRING,
          description: 'UUID ของช่องทางขาย (ถ้าไม่ระบุดูทุกช่องทาง)',
        },
        limit: {
          type: SchemaType.NUMBER,
          description: 'จำนวน top สินค้าที่ต้องการแสดง (default 10, max 50)',
        },
      },
    },
  },
  {
    name: 'runReadOnlyQuery',
    description: 'รัน SQL query แบบ custom สำหรับคำถามที่ฟังก์ชันอื่นตอบไม่ได้ — ใช้ได้เฉพาะ SELECT เท่านั้น ห้ามมี INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE เด็ดขาด',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        sqlQuery: {
          type: SchemaType.STRING,
          description: 'คำสั่ง SQL SELECT ที่ต้องการรัน เช่น "SELECT COUNT(*) FROM sales WHERE status = \'active\'"',
        },
      },
      required: ['sqlQuery'],
    },
  },
]

// ─── Helper: delay ─────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Response type ─────────────────────────────────────────────────

export interface SaranResponse {
  text: string
  inputTokens: number
  outputTokens: number
  modelName: string
}

// ─── Main Chat Function (with retry) ──────────────────────────────

const MAX_RETRIES = 3
const RETRY_DELAYS = [10000, 20000, 45000]

const GEMINI_MODEL = 'gemini-3-flash-preview'

export async function askSaran(
  userMessage: string,
  history: any[] = [],
  userRole: string = 'USER',
): Promise<SaranResponse> {
  let lastError: unknown = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await _askSaranOnce(userMessage, history, userRole)
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      const is429 = message.includes('429') || message.includes('quota') || message.includes('Too Many Requests') || message.includes('RESOURCE_EXHAUSTED')

      if (is429 && attempt < MAX_RETRIES) {
        const waitMs = RETRY_DELAYS[attempt] || 5000
        console.log(`[askSaran] 429 rate limit hit, retrying in ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`)
        await delay(waitMs)
        continue
      }

      break
    }
  }

  // All retries failed
  console.error('[askSaran Error]', lastError)
  const message = lastError instanceof Error ? lastError.message : String(lastError)

  if (message.includes('API key') || message.includes('API_KEY_INVALID')) {
    return { text: 'Saran ยังไม่พร้อมใช้งาน AI ค่ะ — กรุณาตรวจสอบ Gemini API Key 🔑', inputTokens: 0, outputTokens: 0, modelName: GEMINI_MODEL }
  }
  if (message.includes('quota') || message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
    return { text: 'ขออภัยค่ะ 👖 ตอนนี้ Saran ใช้ Token เกินโควต้าแล้วค่ะ กรุณารอสักครู่แล้วลองใหม่นะคะ 💙', inputTokens: 0, outputTokens: 0, modelName: GEMINI_MODEL }
  }

  return { text: 'ขออภัยค่ะ 👖 Saran มีปัญหาเล็กน้อย กรุณาลองใหม่อีกสักครู่นะคะ 💙', inputTokens: 0, outputTokens: 0, modelName: GEMINI_MODEL }
}

// ─── Single attempt ────────────────────────────────────────────────

async function _askSaranOnce(
  userMessage: string,
  history: any[] = [],
  userRole: string = 'USER',
): Promise<SaranResponse> {
  const now = new Date()
  const bkkDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)

  const bkkDayName = new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    weekday: 'long'
  }).format(now)

  const bkkTimeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(now)

  const dynamicSystemInstruction = `${SYSTEM_PROMPT}

## ข้อมูลผู้ใช้งานปัจจุบัน
- Role: ${userRole}

## วันเวลาปัจจุบัน
- วันนี้คือ: ${bkkDayName}
- วันที่ปัจจุบัน (ค.ศ.): ${bkkDateStr}
- เวลาปัจจุบัน: ${bkkTimeStr}

เมื่อผู้ใช้งานพูดกำหนดเวลา เช่น "พรุ่งนี้", "เมื่อวาน", "เดือนนี้" ให้แปลงเป็นวันที่จริงโดยอ้างอิงจากวันที่ปัจจุบัน ${bkkDateStr}`

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: dynamicSystemInstruction,
    tools: [{ functionDeclarations }],
  })

  const chat = model.startChat({ history })
  let response = await chat.sendMessage(userMessage)

  // Handle function calling loop (max 8 iterations)
  let iterations = 0
  const maxIterations = 8

  while (iterations < maxIterations) {
    const candidate = response.response.candidates?.[0]
    if (!candidate) break

    const parts = candidate.content?.parts
    if (!parts) break

    const functionCalls = parts.filter(p => p.functionCall)
    if (functionCalls.length === 0) break

    // Execute each function call
    const functionResponses = []
    for (const part of functionCalls) {
      const fc = part.functionCall!
      console.log(`[askSaran] Function call: ${fc.name}`, fc.args)
      const fn = botFunctions[fc.name]

      let result: unknown
      if (fn) {
        try {
          result = await fn({ ...fc.args })
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err)
          result = { error: `เกิดข้อผิดพลาดในการดึงข้อมูล: ${errMsg}` }
        }
      } else {
        result = { error: `ไม่พบฟังก์ชัน ${fc.name}` }
      }

      console.log(`[askSaran] ${fc.name} returned:`, JSON.stringify(result).substring(0, 300))

      functionResponses.push({
        functionResponse: {
          name: fc.name,
          response: result as object,
        },
      })
    }

    response = await chat.sendMessage(functionResponses)
    iterations++
  }

  if (iterations >= maxIterations) {
    console.warn(`[askSaran] Hit max iterations (${maxIterations})`)
  }

  // Extract token usage
  const usage = response.response.usageMetadata
  const inputTokens = usage?.promptTokenCount || 0
  const outputTokens = usage?.candidatesTokenCount || 0
  console.log(`[askSaran] Tokens — input: ${inputTokens}, output: ${outputTokens}, total: ${inputTokens + outputTokens}`)

  // Extract text response
  let text = ''
  try {
    text = response.response.text()
  } catch {
    const parts = response.response.candidates?.[0]?.content?.parts
    if (parts) {
      text = parts.filter(p => p.text).map(p => p.text).join('')
    }
    console.warn(`[askSaran] text() threw, extracted from parts: "${text.substring(0, 100)}"`)
  }

  const finalText = text || 'ขออภัยค่ะ 👖 Saran ดึงข้อมูลมาแล้วแต่ยังสรุปไม่ได้ค่ะ ลองถามใหม่แบบเจาะจงขึ้นนะคะ 💙'
  return { text: finalText, inputTokens, outputTokens, modelName: GEMINI_MODEL }
}
