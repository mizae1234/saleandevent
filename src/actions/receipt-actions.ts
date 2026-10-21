'use server';

import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { format, differenceInCalendarDays } from 'date-fns';
import { th } from 'date-fns/locale';

export interface SingleReceiptData {
    company: {
        name: string;
        logoUrl: string | null;
        tagline: string;
        footerNote: string | null;
    };
    channel: {
        id: string;
        code: string;
        name: string;
        location: string;
        dateRange: string;
        staffName: string;
        managerName: string;
    };
    sale: {
        id: string;
        billCode: string;
        soldAtFormatted: string;
        items: {
            id: string;
            name: string;
            code: string;
            color: string | null;
            size: string | null;
            quantity: number;
            unitPrice: number;
            totalAmount: number;
        }[];
        totalItems: number;
        subtotal: number;
        discount: number;
        grandTotal: number;
        paymentMethodLabel: string;
        paymentMethodKey: string;
        receivedAmount: number | null;
        changeAmount: number | null;
    };
}

export interface DailySummaryData {
    company: {
        name: string;
        logoUrl: string | null;
        tagline: string;
    };
    channel: {
        id: string;
        code: string;
        name: string;
        location: string;
        dateRange: string;
        staffName: string;
        managerName: string;
    };
    summary: {
        dateFormatted: string; // e.g. 14/10/2026
        dayNumber: number; // e.g. 3 (วันที่ 3 ของงาน)
        printedAtFormatted: string;
        paymentBreakdown: {
            method: string;
            label: string;
            bills: number;
            items: number;
            amount: number;
        }[];
        totalBills: number;
        totalItems: number;
        totalAmount: number;
        grossAmount: number;
        totalDiscount: number;
        discountBillCount: number;
        cancelledBillCount: number;
        netToday: number;
        cumulativeDays: {
            dateShort: string; // 12/10
            bills: number;
            items: number;
            sales: number;
            cumulative: number;
        }[];
        cumulativeTotals: {
            bills: number;
            items: number;
            sales: number;
        };
        signatures: {
            staff: string;
            manager: string;
        };
    };
}

// ============ GET SINGLE RECEIPT DATA ============
export async function getSingleReceiptData(saleId: string): Promise<SingleReceiptData | null> {
    try {
        const [sale, company] = await Promise.all([
            db.sale.findUnique({
                where: { id: saleId },
                include: {
                    items: {
                        include: {
                            product: true,
                        },
                        orderBy: { createdAt: 'asc' },
                    },
                    channel: {
                        include: {
                            staff: {
                                include: {
                                    staff: true,
                                },
                            },
                        },
                    },
                },
            }),
            db.companySetting.findFirst({
                orderBy: { createdAt: 'asc' },
            }),
        ]);

        if (!sale) return null;

        const ch = sale.channel;
        let dateRange = '-';
        if (ch?.startDate && ch?.endDate) {
            dateRange = `${format(new Date(ch.startDate), 'dd/MM/yyyy')} - ${format(new Date(ch.endDate), 'dd/MM/yyyy')}`;
        } else if (ch?.startDate) {
            dateRange = `เริ่ม ${format(new Date(ch.startDate), 'dd/MM/yyyy')}`;
        }

        // Staff name (ชื่อคนขาย) & Manager
        let sellerName: string | null = null;

        // 1. จาก staffId ในบิลขาย
        if (sale.staffId) {
            const seller = await db.staff.findUnique({
                where: { id: sale.staffId },
                select: { name: true },
            });
            if (seller?.name) sellerName = seller.name;
        }

        // 2. จาก createdBy ในบิลขาย (กรณีเป็น ID พนักงาน)
        if (!sellerName && sale.createdBy && sale.createdBy !== '00000000-0000-0000-0000-000000000000') {
            const creator = await db.staff.findUnique({
                where: { id: sale.createdBy },
                select: { name: true },
            });
            if (creator?.name) sellerName = creator.name;
        }

        // 3. จากพนักงานที่ผูกกับจุดขาย (PC / พนักงานขาย หรือคนแรก)
        if (!sellerName && ch?.staff && ch.staff.length > 0) {
            const pcStaff = ch.staff.find((s) => !s.isMain) || ch.staff[0];
            if (pcStaff?.staff?.name) sellerName = pcStaff.staff.name;
        }

        // 4. จาก session ของผู้ใช้งานปัจจุบัน
        if (!sellerName) {
            try {
                const session = await getSession();
                if (session?.name) sellerName = session.name;
            } catch {
                // Ignore session lookup error
            }
        }

        // 5. จากชื่อผู้รับผิดชอบงาน
        if (!sellerName && ch?.responsiblePersonName) {
            sellerName = ch.responsiblePersonName;
        }

        const staffName = sellerName || '-';
        const managerName = '-';

        // Payment method mapping
        const pm = (sale.paymentMethod || 'cash').toLowerCase();
        let pmLabel = 'เงินสด';
        if (pm === 'transfer' || pm === 'qr') pmLabel = 'โอนเงิน (QR Code)';
        else if (pm === 'credit' || pm === 'card') pmLabel = 'บัตรเครดิต';

        const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        let itemsSum = 0;
        const formattedItems = sale.items.map((item) => {
            const amount = Number(item.totalAmount);
            itemsSum += amount;
            return {
                id: item.id,
                name: item.product?.name || 'สินค้า',
                code: item.product?.code || item.barcode,
                color: item.product?.color || null,
                size: item.product?.size || null,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                totalAmount: amount,
            };
        });

        const subtotal = itemsSum;
        const discount = Number(sale.discount || 0);
        const grandTotal = Number(sale.totalAmount);

        return {
            company: {
                name: company?.name || 'SARAN',
                logoUrl: company?.logoUrl || null,
                tagline: '',
                footerNote: company?.footerNote || 'ขอบคุณที่อุดหนุน SARAN\nThank you for shopping with us',
            },
            channel: {
                id: ch?.id || '',
                code: ch?.code || '',
                name: ch?.name || '',
                location: ch?.location || '',
                dateRange,
                staffName,
                managerName,
            },
            sale: {
                id: sale.id,
                billCode: sale.billCode || sale.id.slice(0, 8),
                soldAtFormatted: format(new Date(sale.soldAt), 'dd/MM/yyyy HH:mm', { locale: th }),
                items: formattedItems,
                totalItems,
                subtotal,
                discount,
                grandTotal,
                paymentMethodLabel: pmLabel,
                paymentMethodKey: pm,
                receivedAmount: sale.receivedAmount ? Number(sale.receivedAmount) : null,
                changeAmount: sale.changeAmount !== null && sale.changeAmount !== undefined ? Number(sale.changeAmount) : null,
            },
        };
    } catch (error) {
        console.error('getSingleReceiptData error:', error);
        return null;
    }
}

// ============ GET DAILY SALES SUMMARY DATA ============
export async function getDailySalesSummaryData(
    channelId: string,
    targetDateStr?: string
): Promise<DailySummaryData | null> {
    try {
        const [channel, company] = await Promise.all([
            db.salesChannel.findUnique({
                where: { id: channelId },
                include: {
                    staff: {
                        include: {
                            staff: true,
                        },
                    },
                    sales: {
                        include: {
                            items: true,
                        },
                        orderBy: { soldAt: 'asc' },
                    },
                },
            }),
            db.companySetting.findFirst({
                orderBy: { createdAt: 'asc' },
            }),
        ]);

        if (!channel) return null;

        // If targetDateStr is not provided, use the date of the latest sale or today
        let targetDate: Date;
        if (targetDateStr) {
            targetDate = new Date(targetDateStr);
        } else if (channel.sales.length > 0) {
            targetDate = new Date(channel.sales[channel.sales.length - 1].soldAt);
        } else {
            targetDate = new Date();
        }

        const targetDateFormattedStr = format(targetDate, 'yyyy-MM-dd');

        // Date range
        let dateRange = '-';
        if (channel.startDate && channel.endDate) {
            dateRange = `${format(new Date(channel.startDate), 'dd/MM/yyyy')} - ${format(new Date(channel.endDate), 'dd/MM/yyyy')}`;
        } else if (channel.startDate) {
            dateRange = `เริ่ม ${format(new Date(channel.startDate), 'dd/MM/yyyy')}`;
        }

        // Day of event (e.g. Day 3)
        let dayNumber = 1;
        if (channel.startDate) {
            const start = new Date(channel.startDate);
            const diff = differenceInCalendarDays(targetDate, start);
            dayNumber = Math.max(1, diff + 1);
        }

        // Group sales by day
        // Day sales: sales on targetDateFormattedStr
        const targetDaySales = channel.sales.filter((s) => {
            const saleDateStr = format(new Date(s.soldAt), 'yyyy-MM-dd');
            return saleDateStr === targetDateFormattedStr;
        });

        const activeDaySales = targetDaySales.filter((s) => s.status === 'active');
        const cancelledDaySales = targetDaySales.filter((s) => s.status === 'cancelled');

        // Staff name (ชื่อคนขาย) & Manager
        let sellerName: string | null = null;

        // 1. ดึงชื่อคนขายจาก staffId ของบิลขายในวันนี้
        const staffIdsOnDay = Array.from(
            new Set(activeDaySales.map((s: any) => s.staffId).filter(Boolean))
        ) as string[];

        if (staffIdsOnDay.length > 0) {
            const sellers = await db.staff.findMany({
                where: { id: { in: staffIdsOnDay } },
                select: { name: true },
            });
            const names = sellers.map((s) => s.name).filter(Boolean);
            if (names.length > 0) {
                sellerName = names.join(', ');
            }
        }

        // 2. ถ้าในบิลไม่มี staffId ให้ดูพนักงานที่ผูกกับจุดขายนี้
        if (!sellerName && channel.staff && channel.staff.length > 0) {
            const pcStaff = channel.staff.filter((s) => !s.isMain);
            const targetStaffList = pcStaff.length > 0 ? pcStaff : channel.staff;
            const names = targetStaffList.map((s) => s.staff?.name).filter(Boolean);
            if (names.length > 0) {
                sellerName = names.join(', ');
            }
        }

        // 3. จาก session ของผู้ใช้งานปัจจุบัน
        if (!sellerName) {
            try {
                const session = await getSession();
                if (session?.name) sellerName = session.name;
            } catch {
                // Ignore session lookup error
            }
        }

        // 4. จากผู้รับผิดชอบงาน
        if (!sellerName && channel.responsiblePersonName) {
            sellerName = channel.responsiblePersonName;
        }

        const staffName = sellerName || '-';
        const managerName = '-';

        // Payment breakdown for today
        const pmStats: Record<string, { label: string; bills: number; items: number; amount: number }> = {
            cash: { label: 'เงินสด', bills: 0, items: 0, amount: 0 },
            transfer: { label: 'QR Code / โอนเงิน', bills: 0, items: 0, amount: 0 },
            credit: { label: 'Credit Card', bills: 0, items: 0, amount: 0 },
        };

        let grossAmount = 0;
        let totalDiscount = 0;
        let discountBillCount = 0;

        activeDaySales.forEach((s) => {
            const pmKey = (s.paymentMethod || 'cash').toLowerCase();
            const mappedKey = pmKey === 'credit' || pmKey === 'card' ? 'credit' : pmKey === 'transfer' || pmKey === 'qr' ? 'transfer' : 'cash';
            
            const saleItemCount = s.items.reduce((sum, i) => sum + i.quantity, 0);
            const saleAmount = Number(s.totalAmount);
            const saleDiscount = Number(s.discount || 0);

            pmStats[mappedKey].bills += 1;
            pmStats[mappedKey].items += saleItemCount;
            pmStats[mappedKey].amount += saleAmount;

            // Gross = amount + discount
            grossAmount += saleAmount + saleDiscount;
            if (saleDiscount > 0) {
                totalDiscount += saleDiscount;
                discountBillCount += 1;
            }
        });

        const totalBills = activeDaySales.length;
        const totalItems = activeDaySales.reduce((sum, s) => sum + s.items.reduce((isum, i) => isum + i.quantity, 0), 0);
        const netToday = activeDaySales.reduce((sum, s) => sum + Number(s.totalAmount), 0);

        // Cumulative sales from startDate up to targetDate
        // Group all active sales up to targetDate by calendar date
        const cumulativeMap = new Map<string, { date: Date; bills: number; items: number; sales: number }>();

        channel.sales
            .filter((s) => s.status === 'active')
            .forEach((s) => {
                const sDate = new Date(s.soldAt);
                const sDateStr = format(sDate, 'yyyy-MM-dd');
                if (sDateStr <= targetDateFormattedStr) {
                    const existing = cumulativeMap.get(sDateStr) || { date: sDate, bills: 0, items: 0, sales: 0 };
                    existing.bills += 1;
                    existing.items += s.items.reduce((sum, i) => sum + i.quantity, 0);
                    existing.sales += Number(s.totalAmount);
                    cumulativeMap.set(sDateStr, existing);
                }
            });

        // Sort ascending by date
        const sortedDates = Array.from(cumulativeMap.keys()).sort();
        let runningCumulative = 0;
        const cumulativeDays = sortedDates.map((dStr) => {
            const data = cumulativeMap.get(dStr)!;
            runningCumulative += data.sales;
            return {
                dateShort: format(data.date, 'dd/MM'),
                bills: data.bills,
                items: data.items,
                sales: data.sales,
                cumulative: runningCumulative,
            };
        });

        const cumulativeTotals = {
            bills: cumulativeDays.reduce((sum, d) => sum + d.bills, 0),
            items: cumulativeDays.reduce((sum, d) => sum + d.items, 0),
            sales: runningCumulative,
        };

        return {
            company: {
                name: company?.name || 'SARAN',
                logoUrl: company?.logoUrl || null,
                tagline: '',
            },
            channel: {
                id: channel.id,
                code: channel.code,
                name: channel.name,
                location: channel.location,
                dateRange,
                staffName,
                managerName,
            },
            summary: {
                dateFormatted: format(targetDate, 'dd/MM/yyyy', { locale: th }),
                dayNumber,
                printedAtFormatted: format(new Date(), 'dd/MM/yyyy HH:mm', { locale: th }),
                paymentBreakdown: [
                    { method: 'cash', ...pmStats.cash },
                    { method: 'transfer', ...pmStats.transfer },
                    { method: 'credit', ...pmStats.credit },
                ],
                totalBills,
                totalItems,
                totalAmount: netToday,
                grossAmount,
                totalDiscount,
                discountBillCount,
                cancelledBillCount: cancelledDaySales.length,
                netToday,
                cumulativeDays,
                cumulativeTotals,
                signatures: {
                    staff: staffName,
                    manager: managerName,
                },
            },
        };
    } catch (error) {
        console.error('getDailySalesSummaryData error:', error);
        return null;
    }
}
