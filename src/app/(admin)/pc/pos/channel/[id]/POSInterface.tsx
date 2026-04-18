"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSale } from "@/actions/sale-actions";
import {
    Search, Plus, Minus, Trash2, ShoppingCart,
    CheckCircle, X, Receipt, Tag, PlusCircle, Package, CalendarDays
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
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

interface StockItem {
    barcode: string;
    code: string | null;
    productName: string;
    size: string | null;
    color: string | null;
    price: number;
    quantity: number;
    soldQuantity: number;
    available: number;
}

interface CartItem {
    barcode: string;
    code: string | null;
    productName: string;
    size: string | null;
    color: string | null;
    quantity: number;
    unitPrice: number;
    discount: number;
}

interface Adjustment {
    id: string;
    description: string;
    amount: number;
}

interface POSInterfaceProps {
    channelId: string;
    eventName: string;
    stockItems: StockItem[];
}

export function POSInterface({ channelId, eventName, stockItems }: POSInterfaceProps) {
    const router = useRouter();
    const { toastError } = useToast();
    const [search, setSearch] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
    const [billDiscount, setBillDiscount] = useState(0);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // โหลดข้อมูลจาก localStorage
    useEffect(() => {
        const savedCart = localStorage.getItem(`pos_cart_${channelId}`);
        const savedAdjustments = localStorage.getItem(`pos_adjustments_${channelId}`);
        const savedDiscount = localStorage.getItem(`pos_discount_${channelId}`);

        if (savedCart) {
            try { setCart(JSON.parse(savedCart)); } catch (e) { }
        }
        if (savedAdjustments) {
            try { setAdjustments(JSON.parse(savedAdjustments)); } catch (e) { }
        }
        if (savedDiscount) {
            try { setBillDiscount(Number(savedDiscount)); } catch (e) { }
        }
        setIsLoaded(true);
    }, [channelId]);

    // บันทึกข้อมูลลง localStorage
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(`pos_cart_${channelId}`, JSON.stringify(cart));
            localStorage.setItem(`pos_adjustments_${channelId}`, JSON.stringify(adjustments));
            localStorage.setItem(`pos_discount_${channelId}`, String(billDiscount));
        }
    }, [cart, adjustments, billDiscount, isLoaded, channelId]);
    const [showAddAdjustment, setShowAddAdjustment] = useState(false);
    const [newAdjustment, setNewAdjustment] = useState({ description: "", amount: 0 });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    // วันที่ขาย — default เป็นวันนี้
    const todayStr = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD format
    const [saleDate, setSaleDate] = useState(todayStr);

    // Extract unique categories from product codes (e.g., SR4006, SR6001)
    const categories = useMemo(() => {
        const catMap = new Map<string, { count: number; name: string }>();
        stockItems.forEach(item => {
            const code = item.code || item.barcode;
            if (!catMap.has(code)) {
                catMap.set(code, { count: 0, name: item.productName });
            }
            catMap.get(code)!.count++;
        });
        return Array.from(catMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([code, { count, name }]) => ({ code, name, count }));
    }, [stockItems]);

    // Filter stock items by search AND category
    const filteredStock = useMemo(() => {
        const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'F'];
        const filtered = stockItems.filter(item => {
            // Category filter (match by code)
            if (categoryFilter !== 'all' && (item.code || item.barcode) !== categoryFilter) return false;
            // Search filter
            if (search) {
                const q = search.trim().toLowerCase();
                if (item.barcode.toLowerCase() === q) return true; // Exact match for barcode scanners
                if (item.code?.toLowerCase().includes(q)) return true; // Exact match for code with hyphens
                if (item.productName?.toLowerCase().includes(q)) return true; // Exact match for full product name

                // Split by spaces or hyphens to support "S04-ดำ-L" or "S04 ดำ L"
                const terms = q.split(/[- ]+/).filter(Boolean);
                
                // All terms must match at least one of the attributes
                return terms.every(term => 
                    item.productName?.toLowerCase().includes(term) ||
                    item.code?.toLowerCase().includes(term) ||
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
    }, [stockItems, search, categoryFilter]);

    // Add to cart
    const addToCart = (item: StockItem) => {
        const existing = cart.find(c => c.barcode === item.barcode);
        if (existing) {
            if (existing.quantity < item.available) {
                setCart(cart.map(c =>
                    c.barcode === item.barcode
                        ? { ...c, quantity: c.quantity + 1 }
                        : c
                ));
            }
        } else {
            if (item.available > 0) {
                setCart([...cart, {
                    barcode: item.barcode,
                    code: item.code,
                    productName: item.productName,
                    size: item.size,
                    color: item.color,
                    quantity: 1,
                    unitPrice: item.price,
                    discount: 0
                }]);
            }
        }
    };

    // Update cart item quantity
    const updateQuantity = (barcode: string, delta: number) => {
        const stock = stockItems.find(s => s.barcode === barcode);
        setCart(cart.map(c => {
            if (c.barcode === barcode) {
                const newQty = Math.max(1, Math.min(c.quantity + delta, stock?.available || 1));
                return { ...c, quantity: newQty };
            }
            return c;
        }));
    };

    // Remove from cart
    const removeFromCart = (barcode: string) => {
        setCart(cart.filter(c => c.barcode !== barcode));
    };

    // Update item discount
    const updateItemDiscount = (barcode: string, discount: number) => {
        setCart(cart.map(c =>
            c.barcode === barcode ? { ...c, discount: Math.max(0, discount) } : c
        ));
    };

    // Add adjustment
    const addAdjustment = () => {
        if (newAdjustment.description && newAdjustment.amount !== 0) {
            setAdjustments([...adjustments, {
                id: Date.now().toString(),
                ...newAdjustment
            }]);
            setNewAdjustment({ description: "", amount: 0 });
            setShowAddAdjustment(false);
        }
    };

    // Remove adjustment
    const removeAdjustment = (id: string) => {
        setAdjustments(adjustments.filter(a => a.id !== id));
    };

    // Calculate totals
    const subtotal = cart.reduce((sum, item) =>
        sum + (item.unitPrice - item.discount) * item.quantity, 0
    );
    const adjustmentTotal = adjustments.reduce((sum, a) => sum + a.amount, 0);
    const grandTotal = subtotal + adjustmentTotal - billDiscount;
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Submit sale
    const handleSubmit = async () => {
        const canCheckout = cart.length > 0 || adjustments.length > 0;
        if (!canCheckout) return;

        setIsSubmitting(true);
        try {
            // สร้าง soldAt: ใช้วันที่ที่เลือก + เวลา ณ ตอนนี้
            const [y, m, d] = saleDate.split("-").map(Number);
            const now = new Date();
            const soldAt = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());

            await createSale({
                channelId,
                items: cart.map(item => ({
                    barcode: item.barcode,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discount: item.discount
                })),
                adjustments: adjustments.map(a => ({
                    description: a.description,
                    amount: a.amount
                })),
                discount: billDiscount,
                soldAt,
            });

            // Clear and refresh
            setCart([]);
            setAdjustments([]);
            setBillDiscount(0);
            setShowConfirm(false);
            setMobileTab('products');
            localStorage.removeItem(`pos_cart_${channelId}`);
            localStorage.removeItem(`pos_adjustments_${channelId}`);
            localStorage.removeItem(`pos_discount_${channelId}`);
            router.refresh();
        } catch (error) {
            console.error("Failed to create sale:", error);
            toastError("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ───── Stock List Panel ───── */
    const stockPanel = (
        <div className="flex-1 lg:flex-1 h-full lg:h-auto flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 min-h-0 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' as any }}>
            {/* Search + Category Filter */}
            <div className="p-3 md:p-4 border-b border-slate-100 space-y-2 flex-shrink-0 sticky top-0 bg-white z-10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาสินค้า หรือสแกนบาร์โค้ด..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50/50 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                </div>
                {/* Category Filter Pills */}
                {categories.length > 1 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                        <button
                            onClick={() => setCategoryFilter('all')}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${categoryFilter === 'all'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            ทั้งหมด ({stockItems.length})
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.code}
                                onClick={() => setCategoryFilter(cat.code)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${categoryFilter === cat.code
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {cat.code} ({cat.count})
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Stock Grid */}
            <div className="flex-1 p-3 md:p-4">
                {filteredStock.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">ไม่พบสินค้า{categoryFilter !== 'all' ? ` ในหมวด "${categoryFilter}"` : ''}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                        {filteredStock.map(item => {
                            const inCart = cart.find(c => c.barcode === item.barcode);
                            return (
                                <button
                                    key={item.barcode}
                                    onClick={() => addToCart(item)}
                                    disabled={item.available <= 0}
                                    className={`p-3 md:p-4 rounded-2xl text-left transition-all relative border ${item.available > 0
                                        ? 'bg-white border-slate-100 hover:bg-emerald-50 hover:border-emerald-200 hover:shadow-md active:scale-[0.97]'
                                        : 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
                                        } ${inCart ? 'border-emerald-400 bg-emerald-50 shadow-sm' : ''}`}
                                >
                                    {inCart && (
                                        <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                            {inCart.quantity}
                                        </span>
                                    )}
                                    <h4 className="font-medium text-slate-900 text-sm truncate">{item.productName}</h4>
                                    <p className="text-xs text-slate-500">{item.code || item.barcode}</p>
                                    {(item.size || item.color) && (
                                        <p className="text-xs text-slate-400 truncate">
                                            {item.size && `${item.size}`}
                                            {item.size && item.color && ' • '}
                                            {item.color && `${item.color}`}
                                        </p>
                                    )}
                                    <div className="mt-1.5 flex items-center justify-between">
                                        <span className="text-emerald-600 font-semibold text-sm">฿{item.price.toLocaleString()}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${item.available > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            เหลือ {item.available}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );

    /* ───── Cart Panel ───── */
    const cartPanel = (
        <div className="w-full lg:w-96 h-full lg:h-auto flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 min-h-0 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' as any }}>
            <div className="p-3 md:p-4 border-b border-slate-100 bg-emerald-50/50">
                <h2 className="font-semibold text-emerald-800 flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    ตะกร้าสินค้า ({cart.length})
                </h2>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2">
                {cart.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>ยังไม่มีสินค้าในตะกร้า</p>
                        <p className="text-xs mt-1 lg:hidden">กลับไปหน้าสินค้าเพื่อเลือก</p>
                    </div>
                ) : (
                    cart.map(item => (
                        <div key={item.barcode} className="bg-slate-50/70 rounded-md px-2 py-1.5 border border-slate-100 flex items-center gap-1.5 group">
                            {/* 1. Name & Variants */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-1">
                                    <span className="font-semibold text-slate-900 text-sm truncate">{item.productName}</span>
                                    {(item.size || item.color) && (
                                        <span className="text-[10px] text-slate-500 truncate flex-shrink-0">
                                            {item.size}{item.size && item.color && '·'}{item.color}
                                        </span>
                                    )}
                                </div>
                                <div className="text-[9px] text-slate-400">
                                    {item.code || item.barcode} <span className="ml-1 text-[9px]">@฿{item.unitPrice.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* 2. Quantity */}
                            <div className="flex items-center bg-white border border-slate-200 rounded text-slate-600 shadow-sm flex-shrink-0">
                                <button onClick={() => updateQuantity(item.barcode, -1)} className="px-1.5 py-0.5 hover:bg-slate-50 active:bg-slate-100 border-r border-slate-100"><Minus className="h-3 w-3" /></button>
                                <span className="w-4 text-center text-[10px] font-bold">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.barcode, 1)} className="px-1.5 py-0.5 hover:bg-slate-50 active:bg-slate-100 border-l border-slate-100"><Plus className="h-3 w-3" /></button>
                            </div>

                            {/* 3. Discount Input */}
                            <div className="w-[52px] flex-shrink-0">
                                <input
                                    type="number"
                                    onFocus={(e) => e.target.select()}
                                    placeholder="ลด"
                                    value={item.discount || ''}
                                    onChange={(e) => updateItemDiscount(item.barcode, parseFloat(e.target.value) || 0)}
                                    className="w-full text-[11px] text-center px-1 py-1 bg-white rounded border border-slate-200 focus:outline-none focus:border-emerald-300"
                                />
                            </div>

                            {/* 4. Total Price */}
                            <div className="text-right flex-shrink-0 min-w-[36px]">
                                <p className="text-xs font-bold text-slate-900 leading-none">
                                    ฿{((item.unitPrice - item.discount) * item.quantity).toLocaleString()}
                                </p>
                            </div>

                            {/* 5. Delete Button */}
                            <button
                                onClick={() => removeFromCart(item.barcode)}
                                className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 ml-0.5"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))
                )}

                {/* Adjustments */}
                {adjustments.length > 0 && (
                    <div className="border-t border-slate-100 pt-3 mt-3">
                        <h4 className="text-xs font-medium text-slate-500 mb-2">รายการพิเศษ</h4>
                        {adjustments.map(adj => (
                            <div key={adj.id} className="flex items-center justify-between py-1">
                                <span className="text-sm text-slate-700">{adj.description}</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-medium ${adj.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {adj.amount >= 0 ? '+' : ''}{adj.amount.toLocaleString()}
                                    </span>
                                    <button onClick={() => removeAdjustment(adj.id)} className="text-slate-400 hover:text-red-500">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Adjustment Button */}
                <button
                    onClick={() => setShowAddAdjustment(true)}
                    className="w-full py-2.5 text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-600 flex items-center justify-center gap-2 transition-colors"
                >
                    <PlusCircle className="h-4 w-4" />
                    เพิ่มรายการพิเศษ
                </button>
            </div>

            {/* Summary */}
            <div className="px-3 py-2 md:px-4 md:py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2">
                <div className="space-y-1 mt-1">
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>รวมสินค้า</span>
                        <span className="font-medium text-slate-700">฿{subtotal.toLocaleString()}</span>
                    </div>
                    {adjustmentTotal !== 0 && (
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">รายการพิเศษ</span>
                            <span className={`font-medium ${adjustmentTotal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {adjustmentTotal >= 0 ? '+' : ''}{adjustmentTotal.toLocaleString()}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between text-xs items-center">
                        <span className="text-slate-500">ส่วนลดท้ายบิล</span>
                        <input
                            type="number"
                            onFocus={(e) => e.target.select()}
                            value={billDiscount || ''}
                            onChange={(e) => setBillDiscount(parseFloat(e.target.value) || 0)}
                            className="w-20 text-right px-1.5 py-0.5 bg-white rounded border border-slate-200 focus:outline-none focus:border-emerald-300"
                            placeholder="0"
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-200 pt-1.5 mt-0.5">
                    <span className="text-sm font-bold text-slate-800">ยอดรวม</span>
                    <span className="text-base font-bold text-emerald-600">฿{grandTotal.toLocaleString()}</span>
                </div>

                <button
                    onClick={() => setShowConfirm(true)}
                    disabled={cart.length === 0 && adjustments.length === 0}
                    className="w-full mt-1 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:bg-emerald-800 transition-colors shadow-sm text-sm"
                >
                    <Receipt className="h-4 w-4" />
                    ชำระเงิน
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* ════════ Desktop: side by side ════════ */}
            <div className="flex-1 hidden lg:flex gap-4 pt-4 overflow-hidden">
                {stockPanel}
                {cartPanel}
            </div>

            {/* ════════ Mobile: tab-based (fixed positioning to bypass parent overflow issues) ════════ */}
            <div className="fixed inset-x-0 top-[60px] bottom-[72px] flex flex-col lg:hidden px-4 pt-2 pb-1 z-10 bg-slate-50">
                {/* Mobile Tab Bar */}
                <div className="flex bg-white rounded-xl shadow-sm mb-2 p-1 gap-1 flex-shrink-0">
                    <button
                        onClick={() => setMobileTab('products')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${mobileTab === 'products'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        <Package className="h-4 w-4" />
                        สินค้า ({stockItems.length})
                    </button>
                    <button
                        onClick={() => setMobileTab('cart')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${mobileTab === 'cart'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        <ShoppingCart className="h-4 w-4" />
                        ตะกร้า
                        {cartItemCount > 0 && (
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${mobileTab === 'cart'
                                ? 'bg-white text-emerald-700'
                                : 'bg-emerald-600 text-white'
                                }`}>
                                {cartItemCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Mobile Tab Content */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    {mobileTab === 'products' ? stockPanel : cartPanel}
                </div>

                {/* Floating Cart Summary (when on products tab and cart has items) */}
                {mobileTab === 'products' && cart.length > 0 && (
                    <button
                        onClick={() => setMobileTab('cart')}
                        className="mt-1 flex items-center justify-between bg-emerald-600 text-white rounded-xl px-4 py-3 shadow-lg active:bg-emerald-700 flex-shrink-0"
                    >
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            <span className="font-medium">{cartItemCount} ชิ้น</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold">฿{grandTotal.toLocaleString()}</span>
                            <span className="text-emerald-200">ดูตะกร้า →</span>
                        </div>
                    </button>
                )}
            </div>

            {/* Confirm Dialog */}
            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                            ยืนยันการขาย
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2 text-slate-700 text-base">
                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mt-2 space-y-4">
                                    {/* Sale Date Picker inside Confirm */}
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                            <CalendarDays className="h-4 w-4 text-emerald-600" />
                                            การรับรู้ยอดขาย
                                        </label>
                                        <div className="flex items-center gap-2">
                                            {saleDate !== todayStr && (
                                                <span className="text-[10px] text-amber-600 font-bold bg-amber-100 px-1.5 py-0.5 rounded">ย้อนหลัง</span>
                                            )}
                                            <input
                                                type="date"
                                                value={saleDate}
                                                onChange={(e) => setSaleDate(e.target.value || todayStr)}
                                                className="text-sm font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-slate-800"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="pt-3 border-t border-slate-200">
                                        <div className="flex justify-between items-end mb-1">
                                            <span className="text-sm font-medium text-slate-500">ยอดรวมสุทธิ</span>
                                            <span className="font-bold text-xl text-emerald-600">฿{grandTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-[11px] text-slate-400">
                                            <span>สินค้า {cart.length} รายการ ({cartItemCount} ชิ้น)</span>
                                            {adjustments.length > 0 && <span>+ พิเศษ {adjustments.length} รายการ</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยัน'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Add Adjustment Dialog */}
            <AlertDialog open={showAddAdjustment} onOpenChange={setShowAddAdjustment}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>เพิ่มรายการพิเศษ</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4 pt-2">
                                <div>
                                    <label className="text-sm text-slate-600">รายละเอียด</label>
                                    <input
                                        type="text"
                                        placeholder="เช่น ปรับราคาโปร 1+1"
                                        value={newAdjustment.description}
                                        onChange={(e) => setNewAdjustment({ ...newAdjustment, description: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 bg-transparent border-b border-slate-200 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-slate-600">จำนวนเงิน (+ เพิ่ม, - ลด)</label>
                                    <input
                                        type="number"
                                        onFocus={(e) => e.target.select()}
                                        placeholder="100 หรือ -50"
                                        value={newAdjustment.amount || ''}
                                        onChange={(e) => setNewAdjustment({ ...newAdjustment, amount: parseFloat(e.target.value) || 0 })}
                                        className="w-full mt-1 px-3 py-2 bg-transparent border-b border-slate-200 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={addAdjustment}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            เพิ่ม
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
