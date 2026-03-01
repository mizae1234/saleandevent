import { db } from "@/lib/db";
import Link from "next/link";
import { Plus, Users, Search, Pencil, Trash2 } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/shared";
import { DeleteCustomerButton } from "./DeleteCustomerButton";

const PAGE_SIZE = 20;

async function getCustomers(searchParams: Promise<{ [key: string]: string | string[] | undefined }>) {
    const params = await searchParams;
    const search = typeof params.search === 'string' ? params.search : '';
    const page = typeof params.page === 'string' ? parseInt(params.page) : 1;

    const where = search ? {
        OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { code: { contains: search, mode: 'insensitive' as const } },
            { taxId: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
        ],
    } : {};

    const [customers, total] = await Promise.all([
        db.customer.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
        }),
        db.customer.count({ where }),
    ]);

    return { customers, total, page, totalPages: Math.ceil(total / PAGE_SIZE), search };
}

export default async function CustomersPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { customers, total, page, totalPages, search } = await getCustomers(searchParams);

    return (
        <div className="max-w-6xl mx-auto">
            <PageHeader
                icon={Users}
                title="จัดการลูกค้า"
                subtitle={`ทั้งหมด ${total} ราย`}
                actions={
                    <Link
                        href="/finance/customers/create"
                        className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        เพิ่มลูกค้า
                    </Link>
                }
            />

            {/* Search */}
            <form className="mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        name="search"
                        defaultValue={search}
                        placeholder="ค้นหาชื่อ, รหัส, เลขภาษี, เบอร์โทร..."
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 bg-white"
                    />
                </div>
            </form>

            {/* Table */}
            <div className="bg-white rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left p-3 text-xs font-semibold text-slate-600">รหัส</th>
                                <th className="text-left p-3 text-xs font-semibold text-slate-600">ชื่อลูกค้า</th>
                                <th className="text-left p-3 text-xs font-semibold text-slate-600">เลขประจำตัวผู้เสียภาษี</th>
                                <th className="text-left p-3 text-xs font-semibold text-slate-600">เบอร์โทร</th>
                                <th className="text-center p-3 text-xs font-semibold text-slate-600">เครดิต (วัน)</th>
                                <th className="text-center p-3 text-xs font-semibold text-slate-600">ส่วนลด %</th>
                                <th className="text-center p-3 text-xs font-semibold text-slate-600 w-20">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {customers.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 font-semibold text-teal-700">{c.code}</td>
                                    <td className="p-3 text-slate-900 font-medium">{c.name}</td>
                                    <td className="p-3 text-slate-600">{c.taxId || '-'}</td>
                                    <td className="p-3 text-slate-600">{c.phone || '-'}</td>
                                    <td className="p-3 text-center text-slate-600">{c.creditTerm || 0}</td>
                                    <td className="p-3 text-center text-slate-600">{Number(c.discountPercent || 0)}%</td>
                                    <td className="p-3">
                                        <div className="flex items-center justify-center gap-1">
                                            <Link
                                                href={`/finance/customers/${c.id}/edit`}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                title="แก้ไข"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                            <DeleteCustomerButton id={c.id} name={c.name} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {customers.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-0">
                                        <EmptyState
                                            icon={Users}
                                            message={search ? 'ไม่พบลูกค้าที่ค้นหา' : 'ยังไม่มีข้อมูลลูกค้า'}
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500">
                            แสดง {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} จาก {total} ราย
                        </p>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => (
                                <Link
                                    key={i + 1}
                                    href={`/finance/customers?page=${i + 1}${search ? `&search=${search}` : ''}`}
                                    className={`min-w-[28px] h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${page === i + 1
                                        ? 'bg-teal-600 text-white'
                                        : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    {i + 1}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
