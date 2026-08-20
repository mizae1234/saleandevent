import { useState, useTransition, useOptimistic, useMemo } from "react";
import { Plus, Receipt, Trash2, User, Building2, Filter } from "lucide-react";
import { Spinner, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
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
import { addChannelExpense, removeChannelExpense } from "@/actions/channel";
import { format } from "date-fns";

type ExpenseItem = {
    id: string;
    category: string;
    amount: number;
    description: string;
    status: string;
    createdAt: string;
    createdBy?: string | null;
    createdByName?: string | null;
};

type StaffOption = {
    id: string;
    name: string;
    role?: string | null;
    position?: string | null;
};

type Props = {
    channelId: string;
    expenses: ExpenseItem[];
    categories: string[];
    staffList?: StaffOption[];
    readonly?: boolean;
};

type OptimisticAction =
    | { type: 'add'; expense: ExpenseItem }
    | { type: 'remove'; id: string };

export function EventExpenses({ channelId, expenses, categories, staffList = [], readonly = false }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toastError } = useToast();
    const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all');

    // Optimistic state for instant UI feedback
    const [optimisticExpenses, dispatchOptimistic] = useOptimistic(
        expenses,
        (state: ExpenseItem[], action: OptimisticAction) => {
            if (action.type === 'add') {
                return [action.expense, ...state];
            }
            if (action.type === 'remove') {
                return state.filter(e => e.id !== action.id);
            }
            return state;
        }
    );

    // State for delete confirmation
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        category: "",
        amount: "",
        description: "",
        staffId: "central", // "central" or staffId
    });

    // Compute breakdown by requester
    const breakdown = useMemo(() => {
        const staffMap = new Map<string, { name: string; role?: string | null; amount: number; count: number }>();

        staffList.forEach(s => {
            staffMap.set(s.id, { name: s.name, role: s.role || s.position, amount: 0, count: 0 });
        });

        let centralAmount = 0;
        let centralCount = 0;

        optimisticExpenses.forEach(e => {
            const amt = Number(e.amount) || 0;
            if (e.createdBy && staffMap.has(e.createdBy)) {
                const current = staffMap.get(e.createdBy)!;
                current.amount += amt;
                current.count += 1;
            } else if (e.createdBy) {
                // If createdBy is not in the channel staff list but has a name
                const name = e.createdByName || 'พนักงาน';
                if (!staffMap.has(e.createdBy)) {
                    staffMap.set(e.createdBy, { name, role: null, amount: amt, count: 1 });
                } else {
                    const current = staffMap.get(e.createdBy)!;
                    current.amount += amt;
                    current.count += 1;
                }
            } else {
                centralAmount += amt;
                centralCount += 1;
            }
        });

        const staffBreakdowns = Array.from(staffMap.entries())
            .map(([id, info]) => ({ id, ...info }))
            .filter(s => s.count > 0 || staffList.some(sl => sl.id === s.id));

        return {
            staffBreakdowns,
            central: { amount: centralAmount, count: centralCount },
        };
    }, [optimisticExpenses, staffList]);

    // Filter expenses based on selected filter
    const filteredExpenses = useMemo(() => {
        if (selectedStaffFilter === 'all') return optimisticExpenses;
        if (selectedStaffFilter === 'central') {
            return optimisticExpenses.filter(e => !e.createdBy);
        }
        return optimisticExpenses.filter(e => e.createdBy === selectedStaffFilter);
    }, [optimisticExpenses, selectedStaffFilter]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const selectedStaff = staffList.find(s => s.id === formData.staffId);
        const newExpense: ExpenseItem = {
            id: `temp-${Date.now()}`,
            category: formData.category,
            amount: parseFloat(formData.amount),
            description: formData.description,
            status: 'approved',
            createdAt: new Date().toISOString(),
            createdBy: formData.staffId === 'central' ? null : formData.staffId,
            createdByName: formData.staffId === 'central' ? null : (selectedStaff?.name || null),
        };

        // Close dialog immediately
        setIsOpen(false);
        setFormData({ category: "", amount: "", description: "", staffId: "central" });

        startTransition(async () => {
            // Show optimistic update instantly
            dispatchOptimistic({ type: 'add', expense: newExpense });

            try {
                await addChannelExpense(
                    channelId,
                    {
                        category: newExpense.category,
                        amount: newExpense.amount,
                        description: newExpense.description,
                    },
                    formData.staffId === 'central' ? undefined : formData.staffId
                );
            } catch (error) {
                console.error(error);
                toastError("Failed to add expense");
            }
        });
    };

    const confirmDelete = () => {
        if (!deleteId) return;
        const idToDelete = deleteId;
        setDeleteId(null);

        startTransition(async () => {
            dispatchOptimistic({ type: 'remove', id: idToDelete });
            try {
                await removeChannelExpense(idToDelete, channelId);
            } catch (error) {
                console.error(error);
                toastError("Failed to remove expense");
            }
        });
    };

    const totalAmount = optimisticExpenses.reduce((sum, ex) => sum + Number(ex.amount), 0);

    // Standard input style for this project
    const inputStyle = "border border-slate-200 rounded-lg px-3 py-2.5 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-teal-500/20 focus:border-teal-500 bg-white transition-colors";

    return (
        <div className="rounded-xl bg-white p-6 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] border border-slate-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <Receipt className="h-5 w-5 text-slate-400" />
                    ค่าใช้จ่าย
                </h3>
                {!readonly && (
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-teal-600 text-white hover:bg-teal-700 transition-colors">
                                <Plus className="h-4 w-4 mr-1" />
                                เพิ่มรายการ
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>บันทึกค่าใช้จ่าย</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                                {staffList.length > 0 && (
                                    <div className="grid gap-2">
                                        <Label className="text-slate-700 font-medium">ผู้เบิก / พนักงาน</Label>
                                        <Select
                                            value={formData.staffId}
                                            onValueChange={(val) => setFormData({ ...formData, staffId: val })}
                                        >
                                            <SelectTrigger className={inputStyle}>
                                                <SelectValue placeholder="เลือกผู้เบิก" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="central">
                                                    <div className="flex items-center gap-2 font-medium text-slate-700">
                                                        <span>🏢</span>
                                                        <span>ส่วนกลาง / กองกลาง (ไม่ระบุพนักงาน)</span>
                                                    </div>
                                                </SelectItem>
                                                {staffList.map(s => (
                                                    <SelectItem key={s.id} value={s.id}>
                                                        <div className="flex items-center gap-2">
                                                            <span>👤</span>
                                                            <span className="font-medium text-slate-900">{s.name}</span>
                                                            {(s.role || s.position) && (
                                                                <span className="text-xs text-slate-400">({s.role || s.position})</span>
                                                            )}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div className="grid gap-2">
                                    <Label className="text-slate-700 font-medium">หมวดหมู่</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(val) => setFormData({ ...formData, category: val })}
                                        required
                                    >
                                        <SelectTrigger className={inputStyle}>
                                            <SelectValue placeholder="เลือกหมวดหมู่" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(c => (
                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-slate-700 font-medium">จำนวนเงิน (บาท)</Label>
                                    <Input
                                        type="number"
                                        onFocus={(e) => e.target.select()}
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        required
                                        className={inputStyle}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-slate-700 font-medium">รายละเอียดเพิ่มเติม</Label>
                                    <Input
                                        placeholder="ระบุรายละเอียด (ถ้ามี)"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className={inputStyle}
                                    />
                                </div>
                                <DialogFooter className="mt-4">
                                    <Button type="submit" className="bg-teal-600 text-white hover:bg-teal-700 w-full transition-colors" disabled={isPending}>
                                        {isPending ? <Spinner size="sm" className="mr-2" /> : null}
                                        บันทึก
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Total Summary */}
            <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between shadow-xs">
                <div>
                    <span className="text-xs text-emerald-700 font-medium block">ยอดค่าใช้จ่ายรวมทั้งหมด</span>
                    <span className="text-emerald-900 text-xl font-bold">฿{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
                <span className="text-xs font-semibold text-emerald-800 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200">
                    {optimisticExpenses.length} รายการ
                </span>
            </div>

            {/* Requester Breakdown Cards */}
            {breakdown.staffBreakdowns.length > 0 && (
                <div className="mb-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        สรุปยอดเบิกแยกตามผู้เบิก:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {breakdown.staffBreakdowns.map(s => {
                            const isSelected = selectedStaffFilter === s.id;
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setSelectedStaffFilter(prev => prev === s.id ? 'all' : s.id)}
                                    className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${isSelected
                                        ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                                        : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/70'
                                        }`}
                                >
                                    <div className="min-w-0 flex-1 pr-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-semibold text-slate-900 truncate">{s.name}</span>
                                            {s.role && (
                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-600 font-medium">
                                                    {s.role}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-slate-500">
                                            {s.count} รายการ
                                        </span>
                                    </div>
                                    <span className="text-sm font-bold text-blue-700 flex-shrink-0">
                                        ฿{s.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </span>
                                </button>
                            );
                        })}

                        {breakdown.central.count > 0 && (
                            <button
                                type="button"
                                onClick={() => setSelectedStaffFilter(prev => prev === 'central' ? 'all' : 'central')}
                                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${selectedStaffFilter === 'central'
                                    ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400/20 shadow-xs'
                                    : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/70'
                                    }`}
                            >
                                <div className="min-w-0 flex-1 pr-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-semibold text-slate-800">🏢 ส่วนกลาง / Admin</span>
                                    </div>
                                    <span className="text-[11px] text-slate-500">
                                        {breakdown.central.count} รายการ
                                    </span>
                                </div>
                                <span className="text-sm font-bold text-slate-700 flex-shrink-0">
                                    ฿{breakdown.central.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3 pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1 mr-1">
                    <Filter className="h-3 w-3" /> กรอง:
                </span>
                <button
                    onClick={() => setSelectedStaffFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${selectedStaffFilter === 'all'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    ทั้งหมด ({optimisticExpenses.length})
                </button>
                {breakdown.staffBreakdowns.filter(s => s.count > 0).map(s => (
                    <button
                        key={s.id}
                        onClick={() => setSelectedStaffFilter(s.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${selectedStaffFilter === s.id
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        👤 {s.name.split(' ')[0] || s.name} ({s.count})
                    </button>
                ))}
                {breakdown.central.count > 0 && (
                    <button
                        onClick={() => setSelectedStaffFilter('central')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${selectedStaffFilter === 'central'
                            ? 'bg-slate-700 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        🏢 ส่วนกลาง ({breakdown.central.count})
                    </button>
                )}
            </div>

            {/* List */}
            {filteredExpenses.length > 0 ? (
                <div className="space-y-2.5">
                    {filteredExpenses.map((expense) => {
                        const isCentral = !expense.createdBy;
                        const requesterName = expense.createdByName || (expense.createdBy ? staffList.find(s => s.id === expense.createdBy)?.name : null);

                        return (
                            <div key={expense.id} className={`group flex justify-between items-start p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50/80 transition-all ${expense.id.startsWith('temp-') ? 'opacity-60' : ''}`}>
                                <div className="flex-1 min-w-0 pr-3">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <p className="font-semibold text-slate-900 text-sm">{expense.category}</p>
                                        <span className="text-xs text-slate-400">
                                            {format(new Date(expense.createdAt), "HH:mm")}
                                        </span>
                                        {requesterName ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                <span>👤</span>
                                                <span className="truncate max-w-[180px]">{requesterName}</span>
                                            </span>
                                        ) : isCentral ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                                <span>🏢</span>
                                                <span>ส่วนกลาง / Admin</span>
                                            </span>
                                        ) : null}
                                    </div>
                                    {expense.description && (
                                        <p className="text-xs text-slate-600 mt-0.5">{expense.description}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="font-bold text-slate-800 text-sm">
                                        ฿{Number(expense.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </span>
                                    {!readonly && !expense.id.startsWith('temp-') && (
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
                        );
                    })}
                </div>
            ) : (
                <EmptyState
                    icon={Receipt}
                    message={selectedStaffFilter === 'all' ? "ยังไม่มีรายการค่าใช้จ่าย" : "ไม่พบรายการค่าใช้จ่ายสำหรับผู้เบิกนี้"}
                    className="py-8"
                />
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
                                {isPending ? <Spinner size="sm" className="mr-2" /> : null}
                                ยืนยันลบ
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}
