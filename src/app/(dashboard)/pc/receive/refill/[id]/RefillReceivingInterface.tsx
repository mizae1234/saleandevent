"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, Package, CheckSquare, Square, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type RequestItem = {
    id: string;
    productName: string | null;
    barcode: string;
    size: string | null;
    quantity: number;
    packedQuantity: number | null;
    receivedQuantity: number | null;
};

type Props = {
    requestId: string;
    eventName: string;
    items: RequestItem[];
};

export function RefillReceivingInterface({ requestId, eventName, items }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [receivedItems, setReceivedItems] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {};
        items.forEach(item => {
            initial[item.id] = item.receivedQuantity || item.packedQuantity || 0;
        });
        return initial;
    });

    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        items.forEach(item => {
            initial[item.id] = (item.receivedQuantity || item.packedQuantity || 0) > 0;
        });
        return initial;
    });

    const handleCheck = (itemId: string, packedQty: number) => {
        const isCurrentlyChecked = checkedItems[itemId];
        const newCheckedState = !isCurrentlyChecked;

        setCheckedItems(prev => ({ ...prev, [itemId]: newCheckedState }));

        if (newCheckedState) {
            setReceivedItems(prev => ({ ...prev, [itemId]: packedQty }));
        } else {
            setReceivedItems(prev => ({ ...prev, [itemId]: 0 }));
        }
    };

    const handleQuantityChange = (itemId: string, val: string) => {
        const num = parseInt(val) || 0;
        setReceivedItems(prev => ({ ...prev, [itemId]: num }));

        if (num > 0 && !checkedItems[itemId]) {
            setCheckedItems(prev => ({ ...prev, [itemId]: true }));
        }
    };

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [error, setError] = useState("");

    const handleConfirmReceiving = () => {
        setError("");
        startTransition(async () => {
            try {
                const receivingData = Object.entries(receivedItems).map(([id, qty]) => ({
                    itemId: id,
                    receivedQuantity: qty
                }));

                const res = await fetch(`/api/stock-requests/${requestId}/receive`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ receivingData })
                });

                if (!res.ok) {
                    throw new Error("Failed to complete receiving");
                }

                setIsDialogOpen(false);
                router.push("/pc/receive");
                router.refresh();
            } catch (error) {
                console.error(error);
                setError("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
                setIsDialogOpen(false);
            }
        });
    };

    const getMismatchCount = () => {
        let count = 0;
        items.forEach(item => {
            const received = receivedItems[item.id] || 0;
            const packed = item.packedQuantity || 0;
            if (received !== packed && checkedItems[item.id]) {
                count++;
            }
        });
        return count;
    };

    const renderItemRow = (item: RequestItem) => {
        const isChecked = checkedItems[item.id];
        const receivedQty = receivedItems[item.id] || 0;
        const packedQty = item.packedQuantity || 0;
        const hasMismatch = isChecked && receivedQty !== packedQty;

        return (
            <div
                key={item.id}
                className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all",
                    isChecked
                        ? hasMismatch
                            ? "bg-amber-50 border-amber-300"
                            : "bg-blue-50 border-blue-200"
                        : "bg-white border-slate-100 hover:border-slate-200"
                )}
            >
                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => handleCheck(item.id, packedQty)}>
                    <div className={cn(
                        "transition-colors",
                        isChecked
                            ? hasMismatch
                                ? "text-amber-600"
                                : "text-blue-600"
                            : "text-slate-300"
                    )}>
                        {isChecked ? <CheckSquare className="h-6 w-6" /> : <Square className="h-6 w-6" />}
                    </div>

                    <div>
                        <p className={cn("font-medium transition-colors", isChecked ? "text-slate-900" : "text-slate-500")}>
                            {item.productName}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">{item.barcode} {item.size ? `• ${item.size}` : ''}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-xs text-slate-400 block">ส่งมา</span>
                        <span className="text-sm font-medium text-slate-600">{packedQty}</span>
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="text-xs text-slate-400 block mb-1">รับจริง</span>
                        <Input
                            type="number"
                            min="0"
                            value={receivedQty.toString()}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            className={cn(
                                "w-20 text-right h-9 font-bold",
                                isChecked
                                    ? hasMismatch
                                        ? "border-amber-400 text-amber-700 bg-white"
                                        : "border-blue-300 text-blue-700 bg-white"
                                    : "bg-slate-50 text-slate-400"
                            )}
                            disabled={!isChecked}
                        />
                    </div>

                    {hasMismatch && (
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                    )}
                </div>
            </div>
        );
    };

    const mismatchCount = getMismatchCount();

    return (
        <div className="space-y-6">
            {error && (
                <div className="p-3 rounded-lg bg-red-100 border border-red-200 text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Products Section */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4">
                    <Package className="h-5 w-5 text-blue-500" />
                    รายการสินค้าเบิกเพิ่ม ({items.length})
                </h3>
                {items.length > 0 ? (
                    <div className="space-y-2">
                        {items.map(item => renderItemRow(item))}
                    </div>
                ) : (
                    <p className="text-slate-400 text-center py-4">ไม่มีรายการสินค้า</p>
                )}
            </div>

            {/* Action Bar */}
            <div className="sticky bottom-4 rounded-xl bg-white border border-slate-200 p-4 shadow-lg flex items-center justify-between z-10">
                <div>
                    <p className="text-sm font-medium text-slate-700">
                        รายการที่รับ: {Object.values(checkedItems).filter(Boolean).length} / {items.length}
                    </p>
                    {mismatchCount > 0 && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {mismatchCount} รายการจำนวนไม่ตรง
                        </p>
                    )}
                </div>

                <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <AlertDialogTrigger asChild>
                        <button
                            disabled={isPending}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                        >
                            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                            ยืนยันรับสินค้า
                        </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>ยืนยันการรับสินค้าเบิกเพิ่ม?</AlertDialogTitle>
                            <AlertDialogDescription>
                                กรุณาตรวจสอบจำนวนสินค้าที่รับให้ถูกต้อง เมื่อยืนยันแล้วระบบจะบันทึกสต็อกเข้าหน้างาน
                                {mismatchCount > 0 && (
                                    <span className="block mt-2 text-amber-600 font-medium">
                                        ⚠️ มี {mismatchCount} รายการที่จำนวนไม่ตรงกับที่ส่งมา
                                    </span>
                                )}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isPending}>ยกเลิก</AlertDialogCancel>
                            <button
                                onClick={handleConfirmReceiving}
                                disabled={isPending}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2"
                            >
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                ยืนยัน
                            </button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
