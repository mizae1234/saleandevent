'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createStockRequest, submitStockRequest } from '@/actions/stock-request';
import { ArrowLeft, Send, Package, ShoppingCart, Search, Plus, Minus, X, Info } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import Link from 'next/link';
import { Spinner } from '@/components/shared/Spinner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Channel {
    id: string;
    name: string;
    code: string;
}

interface Product {
    barcode: string;
    code: string | null;
    name: string;
    size: string | null;
    color: string | null;
    price: number;
    category: string | null;
}

interface CartItem extends Product {
    quantity: number;
    notes?: string;
}

interface Props {
    readonly channels: Channel[];
    readonly redirectTo?: string;
    readonly backHref?: string;
    readonly preselectedChannelId?: string;
    readonly hideChannelSelect?: boolean;
    readonly isAdminEdit?: boolean;
    readonly initialCartItems?: CartItem[];
    readonly requestId?: string;
}

export default function NewRefillClient({ 
    channels, 
    redirectTo, 
    backHref, 
    preselectedChannelId, 
    hideChannelSelect,
    isAdminEdit,
    initialCartItems,
    requestId
}: Props) {
    const router = useRouter();
    const { toastError, toastSuccess } = useToast();
    
    // State
    const [channelId, setChannelId] = useState(preselectedChannelId || '');
    const [mainNotes, setMainNotes] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Product & Cart State
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [cart, setCart] = useState<CartItem[]>(initialCartItems || []);
    const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // โหลดข้อมูลจาก localStorage
    useEffect(() => {
        if (!isAdminEdit) {
            const savedCart = localStorage.getItem('refill_cart_draft');
            const savedNotes = localStorage.getItem('refill_notes_draft');
            if (savedCart) {
                try { setCart(JSON.parse(savedCart)); } catch (e) { }
            }
            if (savedNotes) {
                setMainNotes(savedNotes);
            }
        }
        setIsLoaded(true);
    }, [isAdminEdit]);

    // บันทึกข้อมูลลง localStorage
    useEffect(() => {
        if (isLoaded && !isAdminEdit) {
            localStorage.setItem('refill_cart_draft', JSON.stringify(cart));
            localStorage.setItem('refill_notes_draft', mainNotes);
        }
    }, [cart, mainNotes, isLoaded, isAdminEdit]);

    // Fetch Products on mount
    useEffect(() => {
        async function fetchProducts() {
            try {
                const res = await fetch('/api/products');
                if (!res.ok) throw new Error('Failed to fetch products');
                const data = await res.json();
                setProducts(data);
            } catch (err) {
                toastError('ไม่สามารถโหลดข้อมูลสินค้าได้');
            } finally {
                setLoadingProducts(false);
            }
        }
        fetchProducts();
    }, [toastError]);

    // Categories
    const categories = useMemo(() => {
        const catMap = new Map<string, { count: number; name: string }>();
        products.forEach(p => {
            const code = p.code || p.barcode;
            if (!catMap.has(code)) {
                catMap.set(code, { count: 0, name: p.name });
            }
            catMap.get(code)!.count++;
        });
        return Array.from(catMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([code, { count, name }]) => ({ code, name, count }));
    }, [products]);

    // Filtered Products
    const filteredProducts = useMemo(() => {
        const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'F'];
        const filtered = products.filter(item => {
            if (categoryFilter !== 'all' && (item.code || item.barcode) !== categoryFilter) return false;
            
            if (search) {
                const q = search.trim().toLowerCase();
                if (item.barcode.toLowerCase() === q) return true;

                // Split by spaces or hyphens to support "S04-ดำ-L" or "S04 ดำ L"
                const terms = q.split(/[- ]+/).filter(Boolean);
                
                return terms.every(term => 
                    item.name?.toLowerCase().includes(term) ||
                    item.code?.toLowerCase().startsWith(term) ||
                    item.color?.toLowerCase().startsWith(term) ||
                    item.size?.toLowerCase().startsWith(term)
                );
            }
            return true;
        });

        return filtered.sort((a, b) => {
            const codeA = a.code || '';
            const codeB = b.code || '';
            if (codeA !== codeB) return codeA.localeCompare(codeB);
            
            const sizeA = a.size || '';
            const sizeB = b.size || '';
            const sizeIndexA = SIZES.indexOf(sizeA.toUpperCase());
            const sizeIndexB = SIZES.indexOf(sizeB.toUpperCase());
            
            if (sizeIndexA !== -1 && sizeIndexB !== -1) return sizeIndexA - sizeIndexB;
            if (sizeIndexA !== -1) return -1;
            if (sizeIndexB !== -1) return 1;
            
            return sizeA.localeCompare(sizeB);
        });
    }, [products, search, categoryFilter]);

    // Cart Actions
    const addToCart = (product: Product) => {
        const existing = cart.find(c => c.barcode === product.barcode);
        if (existing) {
            setCart(cart.map(c => c.barcode === product.barcode ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([{ ...product, quantity: 1 }, ...cart]);
        }
    };

    const updateQuantity = (barcode: string, delta: number) => {
        setCart(cart.map(c => {
            if (c.barcode === barcode) {
                return { ...c, quantity: Math.max(1, c.quantity + delta) };
            }
            return c;
        }));
    };

    const updateItemNotes = (barcode: string, notes: string) => {
        setCart(cart.map(c => c.barcode === barcode ? { ...c, notes } : c));
    };

    const removeFromCart = (barcode: string) => {
        setCart(cart.filter(c => c.barcode !== barcode));
    };

    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Submit
    const handleSubmit = async () => {
        if (!channelId || cart.length === 0) return;

        setLoading(true);
        try {
            const itemsToSubmit = cart.map(item => ({
                barcode: item.barcode,
                quantity: item.quantity,
                notes: item.notes
            }));

            if (isAdminEdit && requestId) {
                // Import dynamic action to avoid module load context issues or missing top-level module
                const { adminUpdateStockRequest } = await import('@/actions/stock-request/admin-edit');
                await adminUpdateStockRequest(requestId, itemsToSubmit);
                toastSuccess('บันทึกการแก้ไขสำเร็จ');
                router.push(redirectTo || `/warehouse/allocate/${requestId}`);
            } else {
                await createStockRequest(channelId, 'TOPUP', totalQuantity, mainNotes || undefined, itemsToSubmit, true);
                toastSuccess('ส่งคำขอเบิกสินค้าแล้ว');
                localStorage.removeItem('refill_cart_draft');
                localStorage.removeItem('refill_notes_draft');
                router.push(redirectTo || '/pc/refill');
            }
        } catch (err) {
            toastError(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(false);
            setShowConfirm(false);
        }
    };

    if (loadingProducts) {
        return <div className="p-10 flex justify-center"><Spinner size="lg" /></div>;
    }

    const stockPanel = (
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 min-h-0 w-full h-full">
            <div className="p-3 md:p-4 border-b border-slate-100 space-y-2 flex-shrink-0 bg-white z-10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาสินค้า สแกนบาร์โค้ด หรือพิมพ์รุ่น..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50/50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm font-medium"
                    />
                </div>
                {categories.length > 1 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                        <button
                            onClick={() => setCategoryFilter('all')}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${categoryFilter === 'all'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            ทั้งหมด ({products.length})
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.code}
                                onClick={() => setCategoryFilter(cat.code)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${categoryFilter === cat.code
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {cat.code}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex-1 p-3 md:p-4 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' as any }}>
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">ไม่พบสินค้า</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 md:gap-2 cursor-pointer">
                        {filteredProducts.map(item => {
                            const inCart = cart.find(c => c.barcode === item.barcode);
                            return (
                                <button
                                    key={item.barcode}
                                    onClick={() => addToCart(item)}
                                    className={`p-2 md:p-2.5 rounded-xl text-left transition-all relative border bg-white border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 hover:shadow-md active:scale-[0.97] ${inCart ? 'border-indigo-400 bg-indigo-50/50 shadow-sm' : ''}`}
                                >
                                    {inCart && (
                                        <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                                            {inCart.quantity}
                                        </span>
                                    )}
                                    <h4 className="font-semibold text-slate-800 text-xs sm:text-sm truncate leading-tight">{item.name}</h4>
                                    <div className="flex flex-col gap-0.5 mt-1">
                                        <span className="text-[10px] text-slate-500 font-medium">{item.code || item.barcode}</span>
                                        {(item.size || item.color) && (
                                            <span className="text-[10px] text-slate-400 truncate">
                                                {item.size}{item.size && item.color && ' • '}{item.color}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );

    const cartPanel = (
        <div className="w-full lg:w-96 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 min-h-0 h-full">
            <div className="p-3 md:p-4 border-b border-slate-100 bg-indigo-50/50 flex flex-col gap-2 flex-shrink-0">
                <h2 className="font-semibold text-indigo-800 flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    รายการที่ต้องการเบิก ({cart.length})
                </h2>
                
                {!hideChannelSelect && (
                    <div>
                        <select
                            value={channelId}
                            onChange={e => setChannelId(e.target.value)}
                            className="w-full border border-indigo-200 bg-white rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            <option value="">เลือกสาขา / งานอีเวนต์...</option>
                            {channels.map(ch => (
                                <option key={ch.id} value={ch.id}>{ch.name} ({ch.code})</option>
                            ))}
                        </select>
                    </div>
                )}
                
                {hideChannelSelect && preselectedChannelId && (
                    <div className="text-sm font-semibold text-indigo-900 bg-white/60 rounded-lg px-3 py-2 border border-indigo-100">
                        ถึง: {channels.find(ch => ch.id === preselectedChannelId)?.name}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-0 bg-slate-50/30" style={{ WebkitOverflowScrolling: 'touch' as any }}>
                {cart.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                        <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="font-medium text-sm">ยังไม่มีสินค้าในตะกร้า</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {cart.map(item => (
                            <div key={item.barcode} className="bg-white p-2.5 relative group hover:bg-slate-50/50 transition-colors">
                                <div className="flex items-center justify-between gap-2 mb-1.5 pr-6">
                                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                                        <h4 className="font-semibold text-slate-800 text-xs truncate">{item.name}</h4>
                                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-medium flex-shrink-0">{item.code || item.barcode}</span>
                                    </div>
                                    <button
                                        onClick={() => removeFromCart(item.barcode)}
                                        className="absolute top-2 right-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                
                                {((item.size || item.color) && (
                                    <p className="text-[10px] text-slate-500 truncate mb-1.5">
                                        {item.size}{item.size && item.color && ' • '}{item.color}
                                    </p>
                                ))}
                                
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center bg-slate-100/50 rounded p-0.5 border border-slate-200/60">
                                        <button
                                            onClick={() => updateQuantity(item.barcode, -1)}
                                            className="h-5 w-6 rounded-sm bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:bg-slate-100 shadow-sm"
                                        >
                                            <Minus className="h-2.5 w-2.5" />
                                        </button>
                                        <span className="w-7 text-center text-[11px] font-bold text-slate-800">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.barcode, 1)}
                                            className="h-5 w-6 rounded-sm bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:bg-slate-100 shadow-sm"
                                        >
                                            <Plus className="h-2.5 w-2.5" />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)..."
                                        value={item.notes || ''}
                                        onChange={(e) => updateItemNotes(item.barcode, e.target.value)}
                                        className="flex-1 min-w-0 text-[11px] px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-300 placeholder-slate-300"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-3 md:p-4 border-t border-slate-100 bg-white flex-shrink-0">
                <textarea
                    placeholder="หมายเหตุรวมทั้งหมด (ถ้ามี)..."
                    value={mainNotes}
                    onChange={(e) => setMainNotes(e.target.value)}
                    rows={2}
                    className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 mb-3 resize-none"
                />

                <div className="flex justify-between items-end mb-3 px-1">
                    <span className="text-sm font-medium text-slate-500">ยอดเบิกรวม</span>
                    <span className="text-xl font-black text-indigo-600">{totalQuantity} <span className="text-sm font-medium text-slate-500">ชิ้น</span></span>
                </div>

                <button
                    onClick={() => setShowConfirm(true)}
                    disabled={cart.length === 0 || !channelId}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:bg-indigo-800 transition-colors shadow-sm"
                >
                    <Send className="h-5 w-5" />
                    {isAdminEdit ? 'บันทึกแก้ไข (Save Edit)' : 'ส่งคำขอเบิกสินค้า'}
                </button>
            </div>
        </div>
    );

    return (
        <div className="h-screen flex flex-col lg:h-[calc(100vh-60px)] -m-4 lg:m-0 bg-slate-50/50">
            {/* Desktop header */}
            <div className="hidden lg:flex items-center justify-between p-4 pb-0">
                <div className="flex items-center gap-3">
                    <Link href={backHref || "/pc/refill"} className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">
                            {isAdminEdit ? 'ทบทวน / แก้ไขรายการขอเบิก (Admin Edit)' : 'ขอเบิกสินค้า (Item Top-Up)'}
                        </h1>
                        <p className="text-sm text-slate-500">
                            {isAdminEdit ? 'อัปเดตรายการและจำนวนใหม่ ระบบจะบันทึกทันที' : 'เลือกสินค้าและระบุจำนวนที่ต้องการเบิกเพิ่ม'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Mobile back button (optional since top-nav usually handles it, but good for safety) */}
            <div className="lg:hidden p-4 pb-2 flex items-center gap-3 bg-white border-b border-slate-100">
                <Link href={backHref || "/pc/refill"} className="p-1.5 text-slate-400 hover:text-slate-600">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 leading-tight">
                        {isAdminEdit ? 'แก้ไขขอเบิก' : 'เบิกสินค้า (Top-Up)'}
                    </span>
                    {isAdminEdit && <span className="text-[10px] text-indigo-500 font-medium leading-tight">Admin Edit</span>}
                </div>
            </div>

            {/* Layout */}
            <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 lg:pt-4 overflow-hidden min-h-0 h-full">
                <div className="hidden lg:block w-[60%] xl:w-[65%] min-w-0 h-full">
                    {stockPanel}
                </div>
                <div className="hidden lg:block min-w-[350px] max-w-[450px] w-full shrink-0 h-full">
                    {cartPanel}
                </div>

                {/* Mobile Tabs */}
                <div className="lg:hidden flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="flex bg-slate-50 p-1.5 border-b border-slate-100 flex-shrink-0 gap-1.5">
                        <button
                            onClick={() => setMobileTab('products')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${mobileTab === 'products' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
                        >
                            <Package className="h-4 w-4" /> เลือกสินค้า
                        </button>
                        <button
                            onClick={() => setMobileTab('cart')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors relative ${mobileTab === 'cart' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
                        >
                            <ShoppingCart className="h-4 w-4" /> ตะกร้าเบิก
                            {cart.length > 0 && (
                                <span className={`absolute top-2 right-4 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${mobileTab === 'cart' ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'}`}>
                                    {cart.length}
                                </span>
                            )}
                        </button>
                    </div>
                    
                    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                        <div className={`flex-1 flex flex-col min-h-0 ${mobileTab === 'products' ? 'flex' : 'hidden'}`}>
                            {stockPanel}
                        </div>
                        <div className={`flex-1 flex flex-col min-h-0 ${mobileTab === 'cart' ? 'flex' : 'hidden'}`}>
                            {cartPanel}
                        </div>
                    </div>
                </div>
            </div>

            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent className="rounded-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{isAdminEdit ? 'ยืนยันการบันทึกแก้ไข' : 'ยืนยันการส่งคำขอเบิกสินค้า'}</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4 pt-2">
                                <p className="text-slate-500">
                                    {isAdminEdit ? 'คุณต้องการแก้ไขจำนวนในบิลเบิกนี้ใช่หรือไม่? ยอดเดิมจะถูกแทนที่ด้วยยอดใหม่นี้ทันที' : 'คุณต้องการส่งคำขอเบิกสินค้านี้ใช่หรือไม่? เมื่อส่งแล้วจะไม่สามารถแก้ไขประเภทสินค้าได้'}
                                </p>
                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                            <Package className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400">รายการสินค้ารวม</p>
                                            <p className="font-bold text-slate-800">{cart.length} <span className="text-sm font-medium">SKU</span></p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-semibold text-slate-400">จำนวนรวมทั้งหมด</p>
                                        <p className="text-xl font-black text-indigo-600">{totalQuantity} <span className="text-sm">ชิ้น</span></p>
                                    </div>
                                </div>
                                {!isAdminEdit && (
                                    <div className="bg-amber-50 rounded-lg p-3 flex gap-2 items-start border border-amber-100">
                                        <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-amber-700 leading-tight">โกดังจะใช้ข้อมูลนี้เป็นแนวทางในการจัดของ แต่อาจมีการส่งทดแทนขึ้นอยู่กับสต็อกคลังกลาง</p>
                                    </div>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-2">
                        <AlertDialogCancel className="rounded-xl font-medium">กลับไปแก้ไข</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleSubmit}
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium min-w-[120px]"
                        >
                            {loading ? (isAdminEdit ? 'กำลังบันทึก...' : 'กำลังส่งคำขอ...') : (isAdminEdit ? 'ยืนยันบันทึกแก้ไข' : 'ยืนยันส่งคำขอ')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
