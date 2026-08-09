// ─── Constants & Quick Reply Items ─────────────────────────────────

export const QUICK_REPLY_ITEMS = {
  items: [
    {
      type: 'action',
      action: { type: 'message', label: '📊 ยอดขายวันนี้', text: 'ยอดขายวันนี้' },
    },
    {
      type: 'action',
      action: { type: 'message', label: '📈 สรุปภาพรวม', text: 'สรุปภาพรวม' },
    },
    {
      type: 'action',
      action: { type: 'message', label: '🚚 รายงานดำเนินงาน', text: 'รายงานการดำเนินงาน' },
    },
    {
      type: 'action',
      action: { type: 'message', label: '📦 สต็อกคลัง', text: 'สรุปสต็อกคลัง' },
    },
    {
      type: 'action',
      action: { type: 'message', label: '🏪 งานอีเว้นท์ที่เปิดอยู่', text: 'งานอีเว้นท์ที่เปิดอยู่' },
    },
    {
      type: 'action',
      action: { type: 'message', label: '📖 เมนู', text: 'เมนู' },
    },
  ] as any[],
}

// ─── Menu Row & Button Helpers ─────────────────────────────────────

function menuRow(label: string, desc: string) {
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: label, size: 'xs', weight: 'bold', color: '#555555', flex: 4 },
      { type: 'text', text: desc, size: 'xs', color: '#666666', wrap: true, flex: 6 },
    ],
  }
}

function menuButton(label: string, desc: string, actionText: string) {
  return {
    type: 'box',
    layout: 'horizontal',
    action: { type: 'message', label, text: actionText },
    contents: [
      { type: 'text', text: label, size: 'xs', weight: 'bold', color: '#1565C0', flex: 4 },
      { type: 'text', text: desc, size: 'xs', color: '#666666', flex: 6 },
    ],
  }
}

// ─── Menu Flex Message ─────────────────────────────────────────────

export function getMenuFlexMessage() {
  return {
    type: 'flex' as const,
    altText: '📖 เมนูคำสั่ง Saran Bot',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📖 เมนูคำสั่ง',
            weight: 'bold',
            size: 'xl',
            color: '#ffffff',
          },
          {
            type: 'text',
            text: 'Saran Bot — ผู้ช่วย AI ข้อมูลการขายและสต็อก',
            size: 'xs',
            color: '#B3D4FC',
            margin: 'xs',
          },
        ],
        backgroundColor: '#1565C0',
        paddingAll: 'lg',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: '💡 วิธีใช้',
            weight: 'bold',
            size: 'sm',
            color: '#1565C0',
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            contents: [
              menuRow('• แชทส่วนตัว:', 'พิมพ์ถามได้เลย ไม่ต้องใช้คำนำหน้า'),
              menuRow('• แชทกลุ่ม:', 'พิมพ์ "saran" นำหน้า เช่น "saran ยอดขาย"'),
            ],
          },
          { type: 'separator', margin: 'md' },
          {
            type: 'text',
            text: '⚡ คำสั่งลัด',
            weight: 'bold',
            size: 'sm',
            color: '#1565C0',
            margin: 'sm',
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: [
              menuButton('1. ยอดขายวันนี้', 'ดูสรุปยอดขายและจำนวนบิล', 'ยอดขายวันนี้'),
              menuButton('2. สรุปภาพรวม', 'ภาพรวมยอดขายสะสมและ Top 3', 'สรุปภาพรวม'),
              menuButton('3. รายงานดำเนินงาน', 'สถานะขนส่ง คิวเบิกจ่ายจุดขาย', 'รายงานการดำเนินงาน'),
              menuButton('4. สรุปสต็อกคลัง', 'ภาพรวมสินค้าคงเหลือในคลัง', 'สรุปสต็อกคลัง'),
              menuButton('5. งานอีเว้นท์ที่เปิดอยู่', 'ดูบูธ/สาขาที่เปิดให้บริการ', 'งานอีเว้นท์ที่เปิดอยู่'),
              menuButton('6. สินค้าขายดี', 'สินค้ายอดขายสูงสุดเดือนนี้', 'สินค้าขายดีเดือนนี้'),
              menuRow('7. ค้นหาสินค้า [ชื่อ]', 'เช็คสต็อกสินค้าเฉพาะตัว'),
              menuRow('8. ยอดขาย [ชื่องาน]', 'ดูยอดขายเฉพาะช่องทาง'),
            ],
          },
        ],
        paddingAll: 'lg',
      },
    },
    quickReply: QUICK_REPLY_ITEMS,
  }
}

// ─── Sales Summary Flex Message ────────────────────────────────────

export function getSalesSummaryFlexMessage(summary: any) {
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || process.env.NEXT_PUBLIC_LIFF_ID || ''
  
  const paymentItems = (summary.byPaymentMethod || []).map((data: any) => {
    const method = data.method
    const methodName = method === 'cash' ? '💵 เงินสด' : method === 'transfer' ? '📱 โอนเงิน' : '💳 บัตรเครดิต'
    const amount = Number(data.amount)
    return {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: methodName, size: 'xs', color: '#475569' },
        { type: 'text', text: `฿ ${amount.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`, size: 'xs', weight: 'bold', color: '#334155', align: 'end' }
      ]
    }
  })

  const totalAmount = Number(summary.summary.totalAmount)
  const totalBills = summary.summary.totalBills

  return {
    type: 'flex' as const,
    altText: '📊 สรุปยอดขายวันนี้',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📊 สรุปยอดขายวันนี้',
            weight: 'bold',
            size: 'md',
            color: '#ffffff'
          }
        ],
        backgroundColor: '#0284c7',
        paddingAll: 'lg'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'lg',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: 'ยอดขายรวม',
                size: 'xs',
                color: '#64748b'
              },
              {
                type: 'text',
                text: '฿ ' + totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                weight: 'bold',
                size: 'xxl',
                color: '#0f172a',
                margin: 'xs'
              }
            ]
          },
          {
            type: 'separator'
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: 'จำนวนบิล',
                    size: 'xs',
                    color: '#64748b'
                  },
                  {
                    type: 'text',
                    text: totalBills + ' บิล',
                    weight: 'bold',
                    size: 'sm',
                    color: '#334155',
                    margin: 'xs'
                  }
                ],
                flex: 1
              },
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: 'เฉลี่ย/บิล',
                    size: 'xs',
                    color: '#64748b'
                  },
                  {
                    type: 'text',
                    text: '฿ ' + (totalAmount / (totalBills || 1)).toLocaleString('th-TH', { maximumFractionDigits: 0 }),
                    weight: 'bold',
                    size: 'sm',
                    color: '#334155',
                    margin: 'xs'
                  }
                ],
                flex: 1
              }
            ]
          },
          {
            type: 'separator'
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: 'ช่องทางชำระเงิน',
                size: 'xs',
                color: '#64748b',
                weight: 'bold',
                margin: 'none'
              },
              ...paymentItems
            ]
          }
        ],
        paddingAll: 'lg'
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: 'ดูรายละเอียดเพิ่มเติม',
              uri: `https://liff.line.me/${liffId}/sales`
            },
            style: 'primary',
            color: '#0284c7'
          }
        ],
        paddingAll: 'lg'
      }
    },
    quickReply: QUICK_REPLY_ITEMS
  }
}

// ─── Active Events/Channels Flex Message ───────────────────────────

export function getActiveEventsFlexMessage(channels: any[], keyword?: string) {
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || process.env.NEXT_PUBLIC_LIFF_ID || ''

  const itemsToShow = channels.slice(0, 5)

  const itemsContents = itemsToShow.flatMap((ch: any, index: number) => {
    const isEvent = ch.type === 'EVENT'
    const targetText = ch.salesTarget ? `เป้า: ฿${Number(ch.salesTarget).toLocaleString()}` : 'ไม่มีเป้า'
    const locationText = ch.location || '-'
    const dateText = ch.startDate ? new Date(ch.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : ''
    const dateRangeText = ch.endDate && isEvent ? ` - ${new Date(ch.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}` : ''

    const itemRow = {
      type: 'box',
      layout: 'vertical',
      spacing: 'xs',
      margin: index > 0 ? 'md' : 'none',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: `${isEvent ? '📍' : '🏬'} ${ch.name}`,
              weight: 'bold',
              size: 'sm',
              color: '#1e293b',
              flex: 8,
              wrap: true
            },
            {
              type: 'text',
              text: ch.code,
              size: 'xxs',
              color: '#64748b',
              align: 'end',
              flex: 4
            }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: `📍 ${locationText}`,
              size: 'xxs',
              color: '#475569',
              flex: 6,
              wrap: true
            },
            {
              type: 'text',
              text: targetText,
              size: 'xxs',
              color: '#0d9488',
              weight: 'bold',
              align: 'end',
              flex: 6
            }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: `📅 ${dateText}${dateRangeText}`,
              size: 'xxs',
              color: '#64748b',
              flex: 7
            },
            {
              type: 'text',
              text: 'ดูรายละเอียด >',
              size: 'xxs',
              color: '#4f46e5',
              weight: 'bold',
              align: 'end',
              flex: 5,
              action: {
                type: 'uri',
                label: 'ดูรายละเอียด',
                uri: `https://liff.line.me/${liffId}/channels/${ch.id}`
              }
            }
          ]
        }
      ]
    }

    if (index < itemsToShow.length - 1) {
      return [itemRow, { type: 'separator', margin: 'md' } as any]
    }
    return [itemRow]
  })

  const bubble = {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: keyword ? `🔍 ค้นหาบูธ: ${keyword}` : '🏪 งานอีเว้นท์/สาขาที่เปิดอยู่',
          weight: 'bold',
          size: 'md',
          color: '#ffffff',
          wrap: true
        }
      ],
      backgroundColor: '#0d9488',
      paddingAll: 'lg'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        {
          type: 'text',
          text: `รายการบูธที่กำลังเปิดดำเนินการล่าสุด (แสดงสูงสุด 5 บูธ)`,
          size: 'xs',
          color: '#64748b',
          margin: 'none',
          wrap: true
        },
        { type: 'separator', margin: 'sm' } as any,
        ...itemsContents
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#0d9488',
          action: {
            type: 'uri',
            label: '📂 ดูรายชื่อบูธทั้งหมด',
            uri: `https://liff.line.me/${liffId}/channels`
          }
        }
      ],
      paddingAll: 'lg'
    }
  }

  return {
    type: 'flex' as const,
    altText: keyword ? `🏪 ค้นหาบูธ: ${keyword}` : '🏪 งานอีเว้นท์ที่เปิดอยู่',
    contents: bubble,
    quickReply: QUICK_REPLY_ITEMS
  }
}

export function getStockStatusFlexMessage(stockData: any) {
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || process.env.NEXT_PUBLIC_LIFF_ID || ''

  const bubble = {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '📦 สรุปสต็อกคลังและหน้าร้าน', weight: 'bold', size: 'md', color: '#ffffff' }
      ],
      backgroundColor: '#4f46e5',
      paddingAll: 'lg'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'lg',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: 'สต็อกคงเหลือรวมหน้าร้านทุกจุด', size: 'xs', color: '#64748b' },
            { type: 'text', text: `${stockData.channelSummary.totalRemaining.toLocaleString()} ชิ้น`, weight: 'bold', size: 'xl', color: '#4f46e5', margin: 'xs' },
            { type: 'text', text: `ครอบคลุมสินค้า ${stockData.channelSummary.totalSKUs.toLocaleString()} แบบ`, size: 'xxs', color: '#94a3b8' }
          ]
        },
        { type: 'separator' },
        {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '🏢 คลังสินค้าหลัก (ส่วนกลาง)', size: 'xs', weight: 'bold', color: '#334155', flex: 7 },
                { type: 'text', text: `${stockData.warehouseSummary.totalAvailable.toLocaleString()} ชิ้น`, size: 'xs', weight: 'bold', color: '#0f172a', align: 'end', flex: 3 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '• สต็อกที่พร้อมขายได้ทันที', size: 'xxs', color: '#64748b', flex: 7 },
                { type: 'text', text: `${stockData.warehouseSummary.totalAvailable.toLocaleString()} ชิ้น`, size: 'xxs', color: '#64748b', align: 'end', flex: 3 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '• สต็อกสำรอง (จองออเดอร์)', size: 'xxs', color: '#64748b', flex: 7 },
                { type: 'text', text: `${stockData.warehouseSummary.totalReserved.toLocaleString()} ชิ้น`, size: 'xxs', color: '#64748b', align: 'end', flex: 3 }
              ]
            }
          ]
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#4f46e5',
          action: {
            type: 'uri',
            label: 'ค้นหาและเช็คสต็อกสินค้า',
            uri: `https://liff.line.me/${liffId}/stock`
          }
        }
      ],
      paddingAll: 'lg'
    }
  }

  return {
    type: 'flex' as const,
    altText: '📦 สรุปสต็อกคลังและหน้าร้าน',
    contents: bubble,
    quickReply: QUICK_REPLY_ITEMS
  }
}

// ─── Overview & Operations Report Flex Builders ────────────────────

export function getOverviewReportFlexMessage(report: any) {
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || process.env.NEXT_PUBLIC_LIFF_ID || ''
  const fmt = (val: number) => val.toLocaleString('th-TH', { maximumFractionDigits: 0 })

  const topBranches = (report.topBranches || []).slice(0, 3).map((br: any, i: number) => {
    return {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: `${i + 1}. ${br.code} : ${br.name}`, size: 'xs', color: '#475569', flex: 7, wrap: true },
        { type: 'text', text: `฿${fmt(br.salesAmount)}`, size: 'xs', weight: 'bold', color: '#334155', align: 'end', flex: 3 }
      ]
    }
  })

  return {
    type: 'flex' as const,
    altText: '📈 สรุปภาพรวมธุรกิจ',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📈 สรุปภาพรวมธุรกิจ',
            weight: 'bold',
            size: 'md',
            color: '#ffffff'
          }
        ],
        backgroundColor: '#1d4ed8',
        paddingAll: 'lg'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'lg',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: 'ยอดขายรวมสะสมระบบ', size: 'xs', color: '#64748b' },
              {
                type: 'text',
                text: `฿ ${report.totalSales.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                weight: 'bold',
                size: 'xxl',
                color: '#0f172a',
                margin: 'xs'
              }
            ]
          },
          { type: 'separator' },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: '🧾 จำนวนบิลทั้งหมด', size: 'xs', color: '#475569' },
                  { type: 'text', text: `${report.totalBills.toLocaleString()} บิล`, size: 'xs', weight: 'bold', color: '#1e293b', align: 'end' }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: '🎪 งานกำลังดำเนินการ (Ongoing)', size: 'xs', color: '#475569' },
                  { type: 'text', text: `${report.ongoingEvents.length} งาน`, size: 'xs', weight: 'bold', color: '#1e293b', align: 'end' }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: '⚠️ งานเลยกำหนด (Past Due)', size: 'xs', color: '#475569' },
                  { type: 'text', text: `${report.pastDueEvents.length} งาน`, size: 'xs', weight: 'bold', color: '#b91c1c', align: 'end' }
                ]
              }
            ]
          },
          { type: 'separator' },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              { type: 'text', text: '🏆 สาขาทำยอดขายสูงสุด (Top 3)', size: 'xs', weight: 'bold', color: '#64748b' },
              ...topBranches
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#1d4ed8',
            action: {
              type: 'uri',
              label: 'ดูรายละเอียดภาพรวม',
              uri: `https://liff.line.me/${liffId}/overview`
            }
          }
        ],
        paddingAll: 'lg'
      }
    },
    quickReply: QUICK_REPLY_ITEMS,
  }
}

export function getOperationsReportFlexMessage(report: any) {
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || process.env.NEXT_PUBLIC_LIFF_ID || ''
  const fmt = (val: number) => val.toLocaleString('th-TH', { maximumFractionDigits: 0 })

  // Bubble 1: การส่งสินค้า
  const recentShipments = (report.shipments || []).slice(0, 3).map((ship: any) => {
    const statusText = ship.status === 'received' ? '✅ Received' : '🚚 Shipped'
    const statusColor = ship.status === 'received' ? '#16a34a' : '#2563eb'
    return {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: `${ship.channelCode} : ${ship.channelName}`, size: 'xs', color: '#475569', flex: 7, wrap: true },
        { type: 'text', text: statusText, size: 'xs', weight: 'bold', color: statusColor, align: 'end', flex: 3 }
      ]
    }
  })

  const bubble1 = {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '🚚 การส่งสินค้า (Shipments)', weight: 'bold', size: 'md', color: '#ffffff' }
      ],
      backgroundColor: '#0d9488',
      paddingAll: 'lg'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'lg',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: 'จำนวนจุดขายที่มีการส่งของออก', size: 'xs', color: '#64748b' },
            { type: 'text', text: `${report.shipmentStats.totalChannelsWithShipments} จุดขาย`, weight: 'bold', size: 'xl', color: '#0f172a', margin: 'xs' }
          ]
        },
        { type: 'separator' },
        {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            { type: 'text', text: 'รายการส่งของล่าสุด', size: 'xs', weight: 'bold', color: '#64748b' },
            ...recentShipments
          ]
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#0d9488',
          action: {
            type: 'uri',
            label: 'ดูรายละเอียดการส่งสินค้า',
            uri: `https://liff.line.me/${liffId}/operations?tab=shipments`
          }
        }
      ],
      paddingAll: 'lg'
    }
  }

  // Bubble 2: การเบิกสินค้า
  const topRequests = (report.restockingRequests || []).slice(0, 3).map((req: any) => {
    const prefix = req.priorityGroup === 'EVENT' ? '🎪' : '🏢'
    return {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: `${prefix} ${req.channelCode} : ${req.channelName}`, size: 'xs', color: '#475569', flex: 7, wrap: true },
        { type: 'text', text: `${req.requestedQty.toLocaleString()} ชิ้น`, size: 'xs', weight: 'bold', color: '#334155', align: 'end', flex: 3 }
      ]
    }
  })

  const bubble2 = {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '📦 การเบิกสินค้า/Top-up', weight: 'bold', size: 'md', color: '#ffffff' }
      ],
      backgroundColor: '#ea580c',
      paddingAll: 'lg'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'lg',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: 'คำขอเบิกสินค้าค้างส่งรวม', size: 'xs', color: '#64748b' },
            { type: 'text', text: `${report.restockingRequests.length} รายการ`, weight: 'bold', size: 'xl', color: '#0f172a', margin: 'xs' }
          ]
        },
        { type: 'separator' },
        {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            { type: 'text', text: 'รายการคิวเบิกจ่ายตามลำดับ (Priority)', size: 'xs', weight: 'bold', color: '#64748b' },
            ...topRequests
          ]
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#ea580c',
          action: {
            type: 'uri',
            label: 'จัดเรียงคิวเบิกสินค้า',
            uri: `https://liff.line.me/${liffId}/operations?tab=restocking`
          }
        }
      ],
      paddingAll: 'lg'
    }
  }

  // Bubble 3: สรุปจุดขาย
  const bubble3 = {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '🏪 จุดขายในระบบ (Active)', weight: 'bold', size: 'md', color: '#ffffff' }
      ],
      backgroundColor: '#4f46e5',
      paddingAll: 'lg'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'lg',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: 'จุดขายที่มีสถานะเป็น Active ทั้งหมด', size: 'xs', color: '#64748b' },
            { type: 'text', text: `${report.activeChannelsCount.totalActive} จุดขาย`, weight: 'bold', size: 'xl', color: '#0f172a', margin: 'xs' }
          ]
        },
        { type: 'separator' },
        {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '🎪 งานอีเว้นท์ (Event)', size: 'xs', color: '#475569' },
                { type: 'text', text: `${report.activeChannelsCount.totalEvents} จุด`, size: 'xs', weight: 'bold', color: '#1e293b', align: 'end' }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '🏢 สาขาหลัก (Branch)', size: 'xs', color: '#475569' },
                { type: 'text', text: `${report.activeChannelsCount.totalBranches} จุด`, size: 'xs', weight: 'bold', color: '#1e293b', align: 'end' }
              ]
            }
          ]
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#4f46e5',
          action: {
            type: 'uri',
            label: 'ดูข้อมูลจุดขาย',
            uri: `https://liff.line.me/${liffId}/operations?tab=channels`
          }
        }
      ],
      paddingAll: 'lg'
    }
  }

  return {
    type: 'flex' as const,
    altText: '🚚 รายงานการดำเนินงาน',
    contents: {
      type: 'carousel',
      contents: [
        bubble1,
        bubble2,
        bubble3
      ]
    },
    quickReply: QUICK_REPLY_ITEMS
  }
}
