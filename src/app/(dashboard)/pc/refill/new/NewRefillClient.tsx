"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Minus, Trash2, Search, Package, RefreshCw, MapPin } from "lucide-react";
import Link from "next/link";
import { createRefillRequest } from "@/actions/refill-actions";

interface Event {
    id: string;
    name: string;
    code: string;
    location: string;
}

interface Product {
    barcode: string;
    code: string | null;
    name: string;
    size: string | null;
    price: any;
}

interface CartItem {
    barcode: string;
    product: Product;
    quantity: number;
}

interface Props {
    events: Event[];
    products: Product[];
}

export function NewRefillClient({ events, products }: Props) {
    const router = useRouter();
    const [selectedEventId, setSelectedEventId] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedEvent = events.find(e => e.id === selectedEventId);

    // Filter products by search
    const filteredProducts = products.filter(p => {
        const term = searchTerm.toLowerCase();
        return p.name.toLowerCase().includes(term) ||
            p.barcode.toLowerCase().includes(term) ||
            (p.code?.toLowerCase().includes(term));
    });

    // Add product to cart
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.barcode === product.barcode);
            if (existing) {
                return prev.map(item =>
                    item.barcode === product.barcode
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { barcode: product.barcode, product, quantity: 1 }];
        });
    };

    // Update quantity
    const updateQuantity = (barcode: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.barcode === barcode) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    // Remove from cart
    const removeFromCart = (barcode: string) => {
        setCart(prev => prev.filter(item => item.barcode !== barcode));
    };

    // Submit request
    const handleSubmit = async () => {
        if (!selectedEventId) {
            setError("กรุณาเลือก Event");
            return;
        }
        if (cart.length === 0) {
            setError("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const items = cart.map(item => ({
                barcode: item.barcode,
                quantity: item.quantity
            }));

            await createRefillRequest(selectedEventId, items);
            router.push('/pc/refill');
        } catch (err: any) {
            setError(err.message || "เกิดข้อผิดพลาด");
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/pc/refill"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <RefreshCw className="h-6 w-6 text-emerald-600" />
                        ขอเบิกสินค้าเพิ่ม
                    </h1>
                    <p className="text-slate-500">เลือก Event และสินค้าที่ต้องการเบิกเพิ่ม</p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-3 gap-6">
                {/* Left: Event Selection & Product Search */}
                <div className="col-span-2 space-y-4">
                    {/* Event Selection */}
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            เลือก Event
                        </label>
                        <select
                            value={selectedEventId}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">-- เลือก Event --</option>
                            {events.map(event => (
                                <option key={event.id} value={event.id}>
                                    {event.name} ({event.code})
                                </option>
                            ))}
                        </select>

                        {selectedEvent && (
                            <div className="mt-3 p-3 bg-emerald-50 rounded-lg">
                                <p className="font-medium text-emerald-800">{selectedEvent.name}</p>
                                <p className="text-sm text-emerald-600 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {selectedEvent.location}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Product Search */}
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            ค้นหาสินค้า
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="ค้นหาด้วยชื่อ, บาร์โค้ด, หรือรหัสสินค้า..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="max-h-96 overflow-y-auto">
                            {filteredProducts.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                    ไม่พบสินค้า
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2 p-4">
                                    {filteredProducts.slice(0, 20).map((product) => {
                                        const inCart = cart.find(i => i.barcode === product.barcode);
                                        return (
                                            <button
                                                key={product.barcode}
                                                onClick={() => addToCart(product)}
                                                className={`text-left p-3 rounded-lg border transition-all ${inCart
                                                        ? 'border-emerald-500 bg-emerald-50'
                                                        : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <p className="font-medium text-slate-900 truncate">{product.name}</p>
                                                <p className="text-xs text-slate-500">
                                                    {product.code || product.barcode}
                                                    {product.size && ` • ${product.size}`}
                                                </p>
                                                {inCart && (
                                                    <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-500 text-white text-xs rounded">
                                                        x{inCart.quantity}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Cart */}
                <div className="space-y-4">
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden sticky top-4">
                        <div className="bg-[#EFF4FA] px-4 py-3 border-b border-slate-200">
                            <h3 className="font-bold text-slate-900">รายการเบิก ({totalItems} ชิ้น)</h3>
                        </div>

                        {cart.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                <p>ยังไม่มีสินค้า</p>
                                <p className="text-xs mt-1">คลิกสินค้าด้านซ้ายเพื่อเพิ่ม</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                                {cart.map((item) => (
                                    <div key={item.barcode} className="p-3 flex items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 truncate text-sm">{item.product.name}</p>
                                            <p className="text-xs text-slate-500">{item.product.size}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => updateQuantity(item.barcode, -1)}
                                                className="p-1 rounded-full hover:bg-slate-100"
                                            >
                                                <Minus className="h-4 w-4 text-slate-500" />
                                            </button>
                                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.barcode, 1)}
                                                className="p-1 rounded-full hover:bg-slate-100"
                                            >
                                                <Plus className="h-4 w-4 text-slate-500" />
                                            </button>
                                            <button
                                                onClick={() => removeFromCart(item.barcode)}
                                                className="p-1 rounded-full hover:bg-red-100 text-red-500"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="p-4 border-t border-slate-200">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !selectedEventId || cart.length === 0}
                                className="w-full py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'กำลังส่ง...' : 'ส่งคำขอเบิก'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
