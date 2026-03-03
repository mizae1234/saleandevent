import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Plus, UserCog, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/shared";
import { Prisma } from "@prisma/client";
import { EmployeeFilters } from "./EmployeeFilters";
import { ExportStaffButton } from "./ExportStaffButton";
import { format } from "date-fns";
import { th } from "date-fns/locale";

const PAGE_SIZE = 20;

async function getStaffList(searchParams: Promise<{ [key: string]: string | string[] | undefined }>) {
    const params = await searchParams;
    const q = typeof params.q === 'string' ? params.q : '';
    const page = typeof params.page === 'string' ? Math.max(1, parseInt(params.page, 10) || 1) : 1;

    const where: Prisma.StaffWhereInput = {
        status: 'active',
    };

    if (q) {
        where.OR = [
            { name: { contains: q, mode: 'insensitive' } },
            { code: { contains: q, mode: 'insensitive' } },
        ];
    }

    const [staffList, totalCount] = await Promise.all([
        db.staff.findMany({
            where,
            orderBy: { code: 'asc' },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
        }),
        db.staff.count({ where }),
    ]);

    return { staffList, totalCount, page, q };
}

const EMPLOYEE_TYPE_MAP: Record<string, string> = {
    'fulltime': 'ประจำ',
    'parttime': 'พาร์ทไทม์',
    'temporary': 'ชั่วคราว',
};

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const { staffList, totalCount, page, q } = await getStaffList(searchParams);
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    function buildPageUrl(targetPage: number) {
        const p = new URLSearchParams();
        if (q) p.set('q', q);
        if (targetPage > 1) p.set('page', String(targetPage));
        const qs = p.toString();
        return `/hr/employees${qs ? `?${qs}` : ''}`;
    }

    return (
        <div className="space-y-6">
            <PageHeader
                icon={UserCog}
                title="จัดการพนักงาน"
                subtitle="เพิ่ม แก้ไข และจัดการข้อมูลพนักงานทั้งหมด"
                actions={
                    <div className="flex items-center gap-2">
                        <ExportStaffButton />
                        <Link href="/hr/employees/create">
                            <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                                <Plus className="mr-2 h-4 w-4" />
                                เพิ่มพนักงาน
                            </Button>
                        </Link>
                    </div>
                }
            />

            {/* Filters */}
            <EmployeeFilters />

            {/* Table */}
            <div className="rounded-xl bg-white shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="text-left font-semibold text-slate-600 px-6 py-4">รหัส</th>
                                <th className="text-left font-semibold text-slate-600 px-6 py-4">ชื่อ-สกุล</th>
                                <th className="text-left font-semibold text-slate-600 px-6 py-4">บทบาท</th>
                                <th className="text-left font-semibold text-slate-600 px-6 py-4">ประเภท</th>
                                <th className="text-left font-semibold text-slate-600 px-6 py-4">ตำแหน่ง</th>
                                <th className="text-left font-semibold text-slate-600 px-6 py-4">วันเกิด</th>
                                <th className="text-left font-semibold text-slate-600 px-6 py-4">ธนาคาร</th>
                                <th className="text-left font-semibold text-slate-600 px-6 py-4">เลขบัญชี</th>
                                <th className="text-center font-semibold text-slate-600 px-6 py-4 w-20"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffList.map((staff) => (
                                <tr key={staff.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded-md font-medium">
                                            {staff.code || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{staff.name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${staff.role === 'ADMIN' ? 'bg-purple-100 text-purple-700'
                                                : staff.role === 'MANAGER' ? 'bg-blue-100 text-blue-700'
                                                    : staff.role === 'FINANCE' ? 'bg-emerald-100 text-emerald-700'
                                                        : staff.role === 'HR' ? 'bg-pink-100 text-pink-700'
                                                            : staff.role === 'WAREHOUSE' ? 'bg-amber-100 text-amber-700'
                                                                : 'bg-slate-100 text-slate-600'
                                            }`}>{staff.role}</span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {staff.employeeType ? (EMPLOYEE_TYPE_MAP[staff.employeeType] || staff.employeeType) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{staff.position || '-'}</td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {staff.dateOfBirth ? format(new Date(staff.dateOfBirth), 'd MMM yyyy', { locale: th }) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{staff.bankName || '-'}</td>
                                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{staff.bankAccountNo || '-'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <Link
                                            href={`/hr/employees/${staff.id}/edit`}
                                            className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-800 transition-colors"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                            แก้ไข
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {staffList.length === 0 && (
                    <EmptyState
                        icon={UserCog}
                        message="ไม่พบข้อมูลพนักงาน"
                        description="เริ่มเพิ่มพนักงานคนแรกได้เลย"
                        action={
                            <Link href="/hr/employees/create">
                                <Button variant="outline" size="sm" className="text-teal-600 border-teal-200 hover:bg-teal-50">
                                    <Plus className="mr-2 h-4 w-4" />
                                    เพิ่มพนักงาน
                                </Button>
                            </Link>
                        }
                    />
                )}
            </div>

            {/* Pagination & Summary */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                    แสดง {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} จาก {totalCount} รายการ
                </p>

                {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                        {page > 1 ? (
                            <Link href={buildPageUrl(page - 1)}>
                                <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                        ) : (
                            <Button variant="outline" size="sm" className="h-9 w-9 p-0" disabled>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        )}

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <Link key={p} href={buildPageUrl(p)}>
                                <Button
                                    variant={p === page ? "default" : "outline"}
                                    size="sm"
                                    className={`h-9 w-9 p-0 ${p === page ? 'bg-teal-600 hover:bg-teal-700 text-white' : ''}`}
                                >
                                    {p}
                                </Button>
                            </Link>
                        ))}

                        {page < totalPages ? (
                            <Link href={buildPageUrl(page + 1)}>
                                <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        ) : (
                            <Button variant="outline" size="sm" className="h-9 w-9 p-0" disabled>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
