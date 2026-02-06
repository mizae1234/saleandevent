"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completePacking } from "@/actions/event-actions";
import { CheckCircle, Loader2, Package, Wrench, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
    AlertDialog,
    AlertDialogAction,
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
    quantity: number; // Requested quantity
    packedQuantity: number | null;
};

type Props = {
    eventId: string;
    items: RequestItem[];
    equipment: RequestItem[];
    initialStatus: string;
};

export function PackingInterface({ eventId, items, equipment, initialStatus }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // State to track packed quantities and checks
    // We init with existing packed quantities if available, or 0
    const [packedItems, setPackedItems] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {};
        [...items, ...equipment].forEach(item => {
            initial[item.id] = item.packedQuantity || 0;
        });
        return initial;
    });

    // State to track if an item is "checked" (active for packing)
    // If it has packedQuantity > 0, we consider it checked initially
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        [...items, ...equipment].forEach(item => {
            initial[item.id] = (item.packedQuantity || 0) > 0;
        });
        return initial;
    });

    const handleCheck = (itemId: string, requestedQty: number) => {
        const isCurrentlyChecked = checkedItems[itemId];
        const newCheckedState = !isCurrentlyChecked;

        setCheckedItems(prev => ({ ...prev, [itemId]: newCheckedState }));

        // Logic: 
        // If checking -> default quantity to requested amount
        // If unchecking -> set quantity to 0
        if (newCheckedState) {
            setPackedItems(prev => ({ ...prev, [itemId]: requestedQty }));
        } else {
            setPackedItems(prev => ({ ...prev, [itemId]: 0 }));
        }
    };

    const handleQuantityChange = (itemId: string, val: string) => {
        const num = parseInt(val) || 0;
        setPackedItems(prev => ({ ...prev, [itemId]: num }));

        // If user manually types a number > 0, verify it is checked
        if (num > 0 && !checkedItems[itemId]) {
            setCheckedItems(prev => ({ ...prev, [itemId]: true }));
        }
    };

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [error, setError] = useState("");

    const handleConfirmPacking = () => {
        setError("");
        startTransition(async () => {
            try {
                // Convert state to array for server action
                const packingData = Object.entries(packedItems).map(([id, qty]) => ({
                    itemId: id,
                    packedQuantity: qty
                }));

                await completePacking(eventId, packingData);
                setIsDialogOpen(false);
                router.push("/warehouse/packing"); // Redirect to packing queue
            } catch (error) {
                console.error(error);
                setError("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
                setIsDialogOpen(false);
            }
        });
    };

    const renderItemRow = (item: RequestItem, isEquipment: boolean) => {
        const isChecked = checkedItems[item.id];
        const packedQty = packedItems[item.id] || 0;

        return (
            <div
                key={item.id}
                className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all",
                    isChecked
                        ? (isEquipment ? "bg-amber-50 border-amber-200" : "bg-indigo-50 border-indigo-200")
                        : "bg-white border-slate-100 hover:border-slate-200"
                )}
            >
                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => handleCheck(item.id, item.quantity)}>
                    <div className={cn(
                        "transition-colors",
                        isChecked
                            ? (isEquipment ? "text-amber-600" : "text-indigo-600")
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
                        <span className="text-xs text-slate-400 block">ขอมา</span>
                        <span className="text-sm font-medium text-slate-600">{item.quantity}</span>
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="text-xs text-slate-400 block mb-1">แพคจริง</span>
                        <Input
                            type="number"
                            min="0"
                            value={packedQty.toString()}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            className={cn(
                                "w-20 text-right h-9 font-bold",
                                isChecked
                                    ? (isEquipment ? "border-amber-300 text-amber-700 bg-white" : "border-indigo-300 text-indigo-700 bg-white")
                                    : "bg-slate-50 text-slate-400"
                            )}
                            disabled={!isChecked}
                        />
                    </div>
                </div>
            </div>
        );
    };

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
                    <Package className="h-5 w-5 text-indigo-500" />
                    รายการสินค้า ({items.length})
                </h3>
                {items.length > 0 ? (
                    <div className="space-y-2">
                        {items.map(item => renderItemRow(item, false))}
                    </div>
                ) : (
                    <p className="text-slate-400 text-center py-4">ไม่มีรายการสินค้า</p>
                )}
            </div>

            {/* Equipment Section */}
            {equipment.length > 0 && (
                <div className="rounded-xl bg-white p-6 shadow-sm">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4">
                        <Wrench className="h-5 w-5 text-amber-500" />
                        อุปกรณ์ ({equipment.length})
                    </h3>
                    <div className="space-y-2">
                        {equipment.map(item => renderItemRow(item, true))}
                    </div>
                </div>
            )}

            {/* Action Bar */}
            <div className="sticky bottom-4 rounded-xl bg-white border border-slate-200 p-4 shadow-lg flex items-center justify-between z-10">
                <div>
                    <p className="text-sm font-medium text-slate-700">
                        รายการที่แพค: {Object.values(checkedItems).filter(Boolean).length} / {items.length + equipment.length}
                    </p>
                    <p className="text-xs text-slate-500">
                        ตรวจสอบความถูกต้องก่อนบันทึก
                    </p>
                </div>

                <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <AlertDialogTrigger asChild>
                        <button
                            disabled={isPending}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                        >
                            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                            บันทึกและยืนยันการแพค
                        </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>ยืนยันการแพคสินค้า?</AlertDialogTitle>
                            <AlertDialogDescription>
                                กรุณาตรวจสอบจำนวนและรายการสินค้าให้ถูกต้อง เมื่อยืนยันแล้วสถานะจะเปลี่ยนเป็น "แพคเสร็จแล้ว"
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isPending}>ยกเลิก</AlertDialogCancel>
                            <button
                                onClick={handleConfirmPacking}
                                disabled={isPending}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-emerald-600 text-white hover:bg-emerald-700 h-10 px-4 py-2"
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
