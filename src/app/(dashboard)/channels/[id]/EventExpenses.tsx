"use client";

import { useState, useTransition } from "react";
import { Plus, Receipt, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addChannelExpense, removeChannelExpense } from "@/actions/channel-actions";
import { format } from "date-fns";

type Expense = {
    id: string;
    category: string;
    amount: number;
    description: string | null;
    createdAt: Date;
    status: string;
};

type Props = {
    channelId: string;
    expenses: any[];
    readonly?: boolean;
};

const EXPENSE_CATEGORIES = [
    "ค่าเดินทาง",
    "ค่าที่พัก",
    "ค่าเบี้ยเลี้ยง",
    "ค่าอุปกรณ์สิ้นเปลือง",
    "ค่าขนส่ง",
    "อื่นๆ"
];

export function EventExpenses({ channelId, expenses, readonly = false }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    // State for delete confirmation
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        category: "",
        amount: "",
        description: ""
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            try {
                await addChannelExpense(channelId, {
                    category: formData.category,
                    amount: parseFloat(formData.amount),
                    description: formData.description
                });
                setIsOpen(false);
                setFormData({ category: "", amount: "", description: "" });
            } catch (error) {
                console.error(error);
                alert("Failed to add expense");
            }
        });
    };

    const confirmDelete = () => {
        if (!deleteId) return;

        startTransition(async () => {
            try {
                await removeChannelExpense(deleteId, channelId);
                setDeleteId(null);
            } catch (error) {
                console.error(error);
                alert("Failed to remove expense");
            }
        });
    };

    const totalAmount = expenses.reduce((sum, ex) => sum + Number(ex.amount), 0);

    // Standard input style for this project (Border Bottom Only)
    const inputStyle = "border-0 border-b border-slate-200 rounded-none px-0 shadow-none focus-visible:ring-0 focus:border-indigo-500 bg-transparent";

    return (
        <div className="rounded-xl bg-white p-6 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <Receipt className="h-5 w-5 text-slate-400" />
                    ค่าใช้จ่าย
                </h3>
                {!readonly && (
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800">
                                <Plus className="h-4 w-4 mr-1" />
                                เพิ่มรายการ
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>บันทึกค่าใช้จ่าย</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="grid gap-6 py-4">
                                <div className="grid gap-2">
                                    <Label className="text-slate-500">หมวดหมู่</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(val) => setFormData({ ...formData, category: val })}
                                        required
                                    >
                                        <SelectTrigger className={inputStyle}>
                                            <SelectValue placeholder="เลือกหมวดหมู่" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EXPENSE_CATEGORIES.map(c => (
                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-slate-500">จำนวนเงิน (บาท)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        required
                                        className={inputStyle}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-slate-500">รายละเอียดเพิ่มเติม</Label>
                                    <Input
                                        placeholder="ระบุรายละเอียด (ถ้ามี)"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className={inputStyle}
                                    />
                                </div>
                                <DialogFooter className="mt-4">
                                    <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800 w-full" disabled={isPending}>
                                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        บันทึก
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Total Summary */}
            <div className="mb-4 p-4 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                <span className="text-emerald-800 font-medium">รวมทั้งหมด</span>
                <span className="text-emerald-900 text-lg font-bold">฿{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
            </div>

            {/* List */}
            {expenses.length > 0 ? (
                <div className="space-y-3">
                    {expenses.map((expense) => (
                        <div key={expense.id} className="group flex justify-between items-start p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-slate-900">{expense.category}</p>
                                    <span className="text-xs text-slate-400">
                                        {format(new Date(expense.createdAt), "HH:mm")}
                                    </span>
                                </div>
                                {expense.description && (
                                    <p className="text-sm text-slate-500 mt-0.5">{expense.description}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-slate-700">
                                    ฿{Number(expense.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </span>
                                {!readonly && (
                                    <button
                                        onClick={() => setDeleteId(expense.id)}
                                        disabled={isPending}
                                        className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
                                        title="ลบรายการ"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-slate-400 py-8 text-sm border-2 border-dashed border-slate-100 rounded-lg">
                    ยังไม่มีรายการค่าใช้จ่าย
                </p>
            )}

            {/* Delete Confirmation Dialog */}
            {!readonly && (
                <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>ยืนยันการลบรายการ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                คุณต้องการลบรายการค่าใช้จ่ายนี้ใช่หรือไม่ การกระทำนี้ไม่สามารถย้อนกลับได้
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isPending}>ยกเลิก</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    confirmDelete();
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white"
                                disabled={isPending}
                            >
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                ยืนยันลบ
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}
