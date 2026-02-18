"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSale } from "@/actions/sale-actions";
import {
    Search, Plus, Minus, Trash2, ShoppingCart,
    CheckCircle, X, Receipt, Tag, PlusCircle
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

    // Filter stock items
    const filteredStock = stockItems.filter(item =>
        item.productName?.toLowerCase().includes(search.toLowerCase()) ||
        item.barcode.toLowerCase().includes(search.toLowerCase())
    );

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
            router.refresh();
        } catch (error) {
            console.error("Failed to create sale:", error);
            alert("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 flex gap-4 pt-4 overflow-hidden">
            {/* Left: Stock List */}
            <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Search */}
                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาสินค้า หรือสแกนบาร์โค้ด..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-transparent border-b border-slate-200 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Stock Grid */}
                <div className="flex-1 p-4 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filteredStock.map(item => (
                            <button
                                key={item.barcode}
                                onClick={() => addToCart(item)}
                                disabled={item.available <= 0}
                                className={`p-4 rounded-xl text-left transition-all ${item.available > 0
                                    ? 'bg-slate-50 hover:bg-emerald-50 hover:ring-2 hover:ring-emerald-200'
                                    : 'bg-slate-100 opacity-50 cursor-not-allowed'
                                    }`}
                            >
                                <h4 className="font-medium text-slate-900 truncate">{item.productName}</h4>
                                <p className="text-xs text-slate-500">{item.code || item.barcode}</p>
                                {(item.size || item.color) && (
                                    <p className="text-xs text-slate-400">
                                        {item.size && `Size: ${item.size}`}
                                        {item.size && item.color && ' • '}
                                        {item.color && `สี: ${item.color}`}
                                    </p>
                                )}
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-emerald-600 font-semibold">฿{item.price.toLocaleString()}</span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${item.available > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        เหลือ {item.available}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: Cart */}
            <div className="w-96 flex flex-col bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-emerald-50">
                    <h2 className="font-semibold text-emerald-800 flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        ตะกร้าสินค้า ({cart.length})
                    </h2>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="text-center text-slate-400 py-8">
                            <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>ยังไม่มีสินค้าในตะกร้า</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.barcode} className="bg-slate-50 rounded-lg p-3">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-slate-900 text-sm">{item.productName}</h4>
                                        <p className="text-xs text-slate-400">{item.code || item.barcode}</p>
                                        {(item.size || item.color) && (
                                            <p className="text-xs text-slate-500">
                                                {item.size && `Size: ${item.size}`}
                                                {item.size && item.color && ' • '}
                                                {item.color && `สี: ${item.color}`}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => removeFromCart(item.barcode)}
                                        className="text-red-500 hover:bg-red-100 p-1 rounded"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    {/* Quantity */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => updateQuantity(item.barcode, -1)}
                                            className="h-7 w-7 rounded-full bg-white border flex items-center justify-center hover:bg-slate-100"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.barcode, 1)}
                                            className="h-7 w-7 rounded-full bg-white border flex items-center justify-center hover:bg-slate-100"
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                    </div>

                                    {/* Price */}
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-slate-900">
                                            ฿{((item.unitPrice - item.discount) * item.quantity).toLocaleString()}
                                        </p>
                                        {item.discount > 0 && (
                                            <p className="text-xs text-red-500">-฿{(item.discount * item.quantity).toLocaleString()}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Item Discount */}
                                <div className="mt-2 flex items-center gap-2">
                                    <Tag className="h-3 w-3 text-slate-400" />
                                    <input
                                        type="number"
                                        placeholder="ส่วนลด/ชิ้น"
                                        value={item.discount || ''}
                                        onChange={(e) => updateItemDiscount(item.barcode, parseFloat(e.target.value) || 0)}
                                        className="flex-1 text-xs px-2 py-1 bg-transparent border-b border-slate-200 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        ))
                    )}

                    {/* Adjustments */}
                    {adjustments.length > 0 && (
                        <div className="border-t pt-3 mt-3">
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
                        className="w-full py-2 text-sm text-slate-500 border border-dashed rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2"
                    >
                        <PlusCircle className="h-4 w-4" />
                        เพิ่มรายการพิเศษ
                    </button>
                </div>

                {/* Summary */}
                <div className="p-4 border-t bg-slate-50">
                    <div className="space-y-2 mb-4">
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
                                className="w-24 text-right text-sm px-2 py-1 bg-transparent border-b border-slate-200 focus:outline-none focus:border-blue-500"
                                placeholder="0"
                            />
                        </div>
                        <div className="flex justify-between text-lg font-bold pt-2 border-t">
                            <span>ยอดรวม</span>
                            <span className="text-emerald-600">฿{grandTotal.toLocaleString()}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowConfirm(true)}
                        disabled={cart.length === 0}
                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Receipt className="h-5 w-5" />
                        ชำระเงิน
                    </button>
                </div>
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
                                        <span>สินค้า {cart.length} รายการ</span>
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
        </div>
    );
}
