"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createSale } from "@/actions/sale-actions";
import {
    Search, Plus, Minus, Trash2, ShoppingCart,
    CheckCircle, X, Receipt, Tag, PlusCircle, Package
} from "lucide-react";
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
    const [search, setSearch] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
    const [billDiscount, setBillDiscount] = useState(0);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showAddAdjustment, setShowAddAdjustment] = useState(false);
    const [newAdjustment, setNewAdjustment] = useState({ description: "", amount: 0 });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

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
    const filteredStock = stockItems.filter(item => {
        // Category filter (match by code)
        if (categoryFilter !== 'all' && (item.code || item.barcode) !== categoryFilter) return false;
        // Search filter
        if (search) {
            const q = search.toLowerCase();
            return item.productName?.toLowerCase().includes(q) ||
                item.barcode.toLowerCase().includes(q) ||
                item.code?.toLowerCase().includes(q) ||
                item.color?.toLowerCase().includes(q) ||
                item.size?.toLowerCase().includes(q);
        }
        return true;
    });

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
        if (cart.length === 0) return;

        setIsSubmitting(true);
        try {
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
                discount: billDiscount
            });

            // Clear and refresh
            setCart([]);
            setAdjustments([]);
            setBillDiscount(0);
            setShowConfirm(false);
            setMobileTab('products');
            router.refresh();
        } catch (error) {
            console.error("Failed to create sale:", error);
            alert("เกิดข้อผิดพลาดในการบันทึก");
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
                        <div key={item.barcode} className="bg-slate-50/70 rounded-lg px-3 py-2 border border-slate-100">
                            {/* Row 1: Product info + delete + price */}
                            <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-medium text-slate-900 text-sm truncate">{item.productName}</span>
                                        <span className="text-[10px] text-slate-400 flex-shrink-0">{item.code || item.barcode}</span>
                                    </div>
                                    {(item.size || item.color) && (
                                        <p className="text-[11px] text-slate-500 leading-tight">
                                            {item.size}{item.size && item.color && ' • '}{item.color}
                                        </p>
                                    )}
                                </div>
                                <p className="text-sm font-semibold text-slate-900 flex-shrink-0">
                                    ฿{((item.unitPrice - item.discount) * item.quantity).toLocaleString()}
                                </p>
                                <button
                                    onClick={() => removeFromCart(item.barcode)}
                                    className="text-red-400 hover:text-red-500 p-1 rounded transition-colors flex-shrink-0"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            {/* Row 2: Quantity + discount */}
                            <div className="flex items-center justify-between mt-1.5">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => updateQuantity(item.barcode, -1)}
                                        className="h-6 w-6 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:bg-slate-100 transition-colors"
                                    >
                                        <Minus className="h-2.5 w-2.5" />
                                    </button>
                                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.barcode, 1)}
                                        className="h-6 w-6 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:bg-slate-100 transition-colors"
                                    >
                                        <Plus className="h-2.5 w-2.5" />
                                    </button>
                                    <span className="text-[10px] text-slate-400 ml-1">× ฿{item.unitPrice.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Tag className="h-2.5 w-2.5 text-slate-300" />
                                    <input
                                        type="number"
                                        placeholder="ลด"
                                        value={item.discount || ''}
                                        onChange={(e) => updateItemDiscount(item.barcode, parseFloat(e.target.value) || 0)}
                                        className="w-16 text-xs text-right px-1.5 py-0.5 bg-white/80 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                                    />
                                </div>
                            </div>
                            {item.discount > 0 && (
                                <p className="text-[10px] text-red-500 text-right mt-0.5">ลด -฿{(item.discount * item.quantity).toLocaleString()}</p>
                            )}
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
            <div className="p-3 md:p-4 border-t border-slate-100 bg-slate-50/50">
                <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">รวมสินค้า</span>
                        <span className="font-medium">฿{subtotal.toLocaleString()}</span>
                    </div>
                    {adjustmentTotal !== 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">รายการพิเศษ</span>
                            <span className={adjustmentTotal >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                {adjustmentTotal >= 0 ? '+' : ''}{adjustmentTotal.toLocaleString()}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm items-center">
                        <span className="text-slate-500">ส่วนลดท้ายบิล</span>
                        <input
                            type="number"
                            value={billDiscount || ''}
                            onChange={(e) => setBillDiscount(parseFloat(e.target.value) || 0)}
                            className="w-24 text-right text-sm px-2 py-1.5 bg-white/80 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-300"
                            placeholder="0"
                        />
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200">
                        <span>ยอดรวม</span>
                        <span className="text-emerald-600">฿{grandTotal.toLocaleString()}</span>
                    </div>
                </div>

                <button
                    onClick={() => setShowConfirm(true)}
                    disabled={cart.length === 0}
                    className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:bg-emerald-800 transition-colors shadow-sm"
                >
                    <Receipt className="h-5 w-5" />
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
                            <div className="space-y-2">
                                <p>ยืนยันบันทึกการขายรายการนี้?</p>
                                <div className="bg-slate-50 rounded-lg p-3 mt-2">
                                    <div className="flex justify-between">
                                        <span>สินค้า {cart.length} รายการ ({cartItemCount} ชิ้น)</span>
                                        <span className="font-semibold text-emerald-600">฿{grandTotal.toLocaleString()}</span>
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
