import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Plus, Tag, Pencil, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared";
import { Prisma } from "@prisma/client";
import { ProductFilters } from "./ProductFilters";
import { DeleteProductButton } from "./DeleteProductButton";
import { ExportProductsButton } from "./ExportProductsButton";

const PAGE_SIZE = 25;

async function getProductList(searchParams: Promise<{ [key: string]: string | string[] | undefined }>) {
    const params = await searchParams;
    const q = typeof params.q === 'string' ? params.q : '';
    const category = typeof params.category === 'string' ? params.category : '';
    const page = typeof params.page === 'string' ? Math.max(1, parseInt(params.page, 10) || 1) : 1;

    const where: Prisma.ProductWhereInput = {
        status: 'active',
    };

    if (q) {
        where.OR = [
            { barcode: { contains: q, mode: 'insensitive' } },
            { code: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
        ];
    }

    if (category) {
        where.category = category;
    }

    const [products, totalCount] = await Promise.all([
        db.product.findMany({
            where,
            include: {
                warehouseStock: {
                    select: { quantity: true },
                },
            },
            orderBy: [{ name: 'asc' }, { size: 'asc' }],
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
        }),
        db.product.count({ where }),
    ]);

    return { products, totalCount, page, q, category };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const { products, totalCount, page, q, category } = await getProductList(searchParams);
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    function buildPageUrl(targetPage: number) {
        const p = new URLSearchParams();
        if (q) p.set('q', q);
        if (category) p.set('category', category);
        if (targetPage > 1) p.set('page', String(targetPage));
        const qs = p.toString();
        return `/admin/products${qs ? `?${qs}` : ''}`;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <Tag className="h-8 w-8 text-teal-600" />
                        จัดการสินค้า
                    </h2>
                    <p className="text-slate-500 mt-1">เพิ่ม แก้ไข และจัดการสินค้าทั้งหมดในระบบ</p>
                </div>
                <div className="flex items-center gap-3">
                    <ExportProductsButton />
                    <Link href="/admin/products/create">
                        <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                            <Plus className="mr-2 h-4 w-4" />
                            เพิ่มสินค้า
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <ProductFilters />

            {/* Stats bar */}
            <div className="flex items-center gap-4">
                <div className="px-3 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                    ทั้งหมด {totalCount} รายการ
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl bg-white shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="text-left font-semibold text-slate-600 px-6 py-4">บาร์โค้ด</th>
                                <th className="text-left font-semibold text-slate-600 px-6 py-4">รหัส</th>
                                <th className="text-left font-semibold text-slate-600 px-6 py-4">ชื่อสินค้า</th>
                                <th className="text-left font-semibold text-slate-600 px-6 py-4">ไซส์</th>
                                <th className="text-left font-semibold text-slate-600 px-6 py-4">สี</th>
                                <th className="text-left font-semibold text-slate-600 px-6 py-4">หมวดหมู่</th>
                                <th className="text-right font-semibold text-slate-600 px-6 py-4">ราคา</th>
                                <th className="text-right font-semibold text-slate-600 px-6 py-4">สต็อก</th>
                                <th className="text-center font-semibold text-slate-600 px-6 py-4 w-28"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product) => (
                                <tr key={product.barcode} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-medium">
                                            {product.barcode}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {product.code ? (
                                            <span className="font-mono text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded-md font-medium">
                                                {product.code}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{product.name}</td>
                                    <td className="px-6 py-4 text-slate-600">{product.size || '-'}</td>
                                    <td className="px-6 py-4 text-slate-600">{product.color || '-'}</td>
                                    <td className="px-6 py-4">
                                        {product.category ? (
                                            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                                                {product.category}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                                        {product.price ? `฿${Number(product.price).toLocaleString('th-TH', { minimumFractionDigits: 0 })}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`font-mono text-xs font-medium px-2 py-1 rounded-md ${(product.warehouseStock?.quantity ?? 0) > 0
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-red-50 text-red-600'
                                            }`}>
                                            {product.warehouseStock?.quantity ?? 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Link
                                                href={`/admin/products/${encodeURIComponent(product.barcode)}/edit`}
                                                className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-800 transition-colors"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                                แก้ไข
                                            </Link>
                                            <DeleteProductButton barcode={product.barcode} name={product.name} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {products.length === 0 && (
                    <EmptyState
                        icon={Tag}
                        message="ไม่พบสินค้า"
                        description="เริ่มเพิ่มสินค้าชิ้นแรกได้เลย"
                        action={
                            <Link href="/admin/products/create">
                                <Button variant="outline" size="sm" className="text-teal-600 border-teal-200 hover:bg-teal-50">
                                    <Plus className="mr-2 h-4 w-4" />
                                    เพิ่มสินค้า
                                </Button>
                            </Link>
                        }
                    />
                )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                    แสดง {totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} จาก {totalCount} รายการ
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

                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                            // Show pages around current page
                            let p: number;
                            if (totalPages <= 7) {
                                p = i + 1;
                            } else if (page <= 4) {
                                p = i + 1;
                            } else if (page >= totalPages - 3) {
                                p = totalPages - 6 + i;
                            } else {
                                p = page - 3 + i;
                            }
                            return (
                                <Link key={p} href={buildPageUrl(p)}>
                                    <Button
                                        variant={p === page ? "default" : "outline"}
                                        size="sm"
                                        className={`h-9 w-9 p-0 ${p === page ? 'bg-teal-600 hover:bg-teal-700 text-white' : ''}`}
                                    >
                                        {p}
                                    </Button>
                                </Link>
                            );
                        })}

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
