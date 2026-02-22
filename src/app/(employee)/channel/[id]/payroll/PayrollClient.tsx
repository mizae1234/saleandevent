"use client";

import { useState, useTransition } from "react";
import { Plus, Receipt, Trash2, Loader2, X, Tag, Clock, ChevronDown, CalendarDays, Save, Check } from "lucide-react";
import { addChannelExpense, removeChannelExpense, updateEmployeeCompensation } from "@/actions/channel-actions";
import { useRouter } from "next/navigation";

const EXPENSE_CATEGORIES = [
    "ค่าเดินทาง",
    "ค่าที่พัก",
    "ค่าเบี้ยเลี้ยง",
    "ค่าอาหาร",
    "ค่าอุปกรณ์สิ้นเปลือง",
    "ค่าขนส่ง",
    "อื่นๆ",
];

interface ExpenseItem {
    id: string;
    category: string;
    amount: number;
    description: string | null;
    status: string;
    createdAt: string;
}

interface WageInfo {
    dailyRate: number;
    daysWorked: number;
    commission: number;
    attendanceDays: number;
    wageSummary: number;
}

interface Props {
    channelId: string;
    staffId: string;
    startDate: string | null;
    endDate: string | null;
    expenses: ExpenseItem[];
    wage: WageInfo;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    draft: { label: "แบบร่าง", color: "bg-slate-100 text-slate-600" },
    pending: { label: "รอตรวจ", color: "bg-amber-100 text-amber-700" },
    approved: { label: "อนุมัติ", color: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "ไม่อนุมัติ", color: "bg-red-100 text-red-700" },
};

function formatDate(isoString: string) {
    return new Date(isoString).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
    });
}

export function PayrollClient({ channelId, staffId, startDate, endDate, expenses: initialExpenses, wage }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showForm, setShowForm] = useState(false);
    const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);

    // Compensation editing (days + commission)
    const [editing, setEditing] = useState(false);
    const [daysInput, setDaysInput] = useState(String(wage.daysWorked));
    const [commissionInput, setCommissionInput] = useState(String(wage.commission));
    const [saved, setSaved] = useState(false);

    const currentDays = editing ? (parseInt(daysInput) || 0) : wage.daysWorked;
    const currentCommission = editing ? (parseFloat(commissionInput) || 0) : wage.commission;
    const previewWage = (wage.dailyRate * currentDays) + currentCommission;

    const handleStartEdit = () => {
        setEditing(true);
        setDaysInput(String(wage.daysWorked));
        setCommissionInput(String(wage.commission));
    };

    const handleSaveCompensation = () => {
        const days = parseInt(daysInput);
        const commission = parseFloat(commissionInput);
        if (isNaN(days) || days < 0) return;
        if (isNaN(commission) || commission < 0) return;

        startTransition(async () => {
            await updateEmployeeCompensation(channelId, staffId, { daysWorked: days, commission });
            setEditing(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            router.refresh();
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsedAmount = parseFloat(amount);
        if (!parsedAmount || parsedAmount <= 0) return;

        startTransition(async () => {
            await addChannelExpense(channelId, {
                category,
                amount: parsedAmount,
                description: description || category,
            });
            setAmount("");
            setDescription("");
            setShowForm(false);
            router.refresh();
        });
    };

    const handleDelete = (expenseId: string) => {
        startTransition(async () => {
            await removeChannelExpense(expenseId, channelId);
            router.refresh();
        });
    };

    const totalExpenses = initialExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    return (
        <div className="space-y-4">
            {/* ── Event Date Range ── */}
            {(startDate || endDate) && (
                <div className="flex items-center gap-2 px-1 text-xs text-slate-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>
                        ช่วงงาน: {startDate ? formatDate(startDate) : '—'} – {endDate ? formatDate(endDate) : '—'}
                    </span>
                </div>
            )}

            {/* ── Wage Summary ── */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white shadow-lg shadow-blue-200/50">
                <div className="flex items-center justify-between">
                    <p className="text-blue-100 text-xs font-medium">สรุปค่าแรง</p>
                    {!editing && (
                        <button
                            onClick={handleStartEdit}
                            className="text-[11px] text-blue-200 hover:text-white underline underline-offset-2 transition-colors"
                        >
                            แก้ไข
                        </button>
                    )}
                </div>

                {editing ? (
                    /* ── Edit Mode ── */
                    <div className="mt-2 space-y-2">
                        {/* Days & Commission - Side by side */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/15 rounded-lg p-2.5">
                                <span className="text-blue-100 text-[11px] font-medium">วันทำงาน</span>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <input
                                        type="number"
                                        value={daysInput}
                                        onChange={(e) => setDaysInput(e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                        className="w-14 px-2 py-1.5 rounded-lg bg-white/20 text-white text-lg font-bold text-center border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        min="0"
                                        autoFocus
                                    />
                                    <span className="text-blue-100 text-xs">วัน</span>
                                </div>
                                <p className="text-blue-200 text-[10px] mt-1">× ฿{wage.dailyRate.toLocaleString()}/วัน</p>
                            </div>

                            <div className="bg-white/15 rounded-lg p-2.5">
                                <span className="text-blue-100 text-[11px] font-medium">คอมมิชชั่น</span>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-blue-100 text-sm">฿</span>
                                    <input
                                        type="number"
                                        value={commissionInput}
                                        onChange={(e) => setCommissionInput(e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                        className="w-full px-2 py-1.5 rounded-lg bg-white/20 text-white text-lg font-bold text-center border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Preview Total */}
                        <div className="pt-2 border-t border-white/20 flex justify-between items-end">
                            <span className="text-blue-200 text-xs">รวมค่าแรง (preview)</span>
                            <span className="text-xl font-bold">฿{previewWage.toLocaleString()}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={() => setEditing(false)}
                                className="flex-1 py-2 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSaveCompensation}
                                disabled={isPending}
                                className="flex-1 py-2 text-xs font-semibold bg-white text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 flex items-center justify-center gap-1 transition-colors"
                            >
                                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                บันทึก
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── Display Mode ── */
                    <>
                        <div className="mt-2 bg-white/15 rounded-lg p-2.5">
                            <span className="text-blue-100 text-[11px] font-medium">จำนวนวันทำงาน</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-2xl font-bold">{wage.daysWorked}</span>
                                <span className="text-blue-200 text-xs">วัน</span>
                                {saved && (
                                    <span className="ml-auto flex items-center gap-1 text-[11px] text-emerald-200">
                                        <Check className="h-3 w-3" /> บันทึกแล้ว
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                                <p className="text-lg font-bold">฿{wage.dailyRate.toLocaleString()}</p>
                                <p className="text-blue-200 text-[10px]">ค่าแรง/วัน</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold">฿{wage.commission.toLocaleString()}</p>
                                <p className="text-blue-200 text-[10px]">คอมมิชชั่น</p>
                            </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-white/20 flex justify-between items-end">
                            <span className="text-blue-200 text-xs">รวมค่าแรง</span>
                            <span className="text-xl font-bold">฿{wage.wageSummary.toLocaleString()}</span>
                        </div>
                    </>
                )}
            </div>

            {/* ── Expenses Section ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-purple-600" />
                        <h3 className="font-semibold text-slate-900">เบิกค่าใช้จ่าย</h3>
                        {initialExpenses.length > 0 && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                {initialExpenses.length}
                            </span>
                        )}
                    </div>
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-1.5 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            เพิ่ม
                        </button>
                    )}
                </div>

                {/* Inline Add Form */}
                {showForm && (
                    <form onSubmit={handleSubmit} className="p-4 bg-purple-50/50 border-b border-slate-100">
                        <div className="space-y-3">
                            {/* Category Picker */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 bg-white rounded-xl border border-slate-200 text-sm"
                                >
                                    <div className="flex items-center gap-2">
                                        <Tag className="h-4 w-4 text-slate-400" />
                                        <span>{category}</span>
                                    </div>
                                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showCategoryPicker ? 'rotate-180' : ''}`} />
                                </button>
                                {showCategoryPicker && (
                                    <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                                        {EXPENSE_CATEGORIES.map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => { setCategory(cat); setShowCategoryPicker(false); }}
                                                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-purple-50 transition-colors ${category === cat ? 'bg-purple-50 text-purple-700 font-medium' : 'text-slate-700'}`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Amount */}
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
                                <input
                                    type="number"
                                    placeholder="จำนวนเงิน"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2.5 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
                                    required
                                    min="1"
                                    step="0.01"
                                    autoFocus
                                />
                            </div>

                            {/* Description */}
                            <input
                                type="text"
                                placeholder="รายละเอียด (ไม่บังคับ)"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2.5 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
                            />

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending || !amount}
                                    className="flex-1 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                                >
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    บันทึก
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {/* Expense List */}
                <div className="divide-y divide-slate-50">
                    {initialExpenses.length === 0 && !showForm ? (
                        <div className="text-center py-8 text-slate-400">
                            <Receipt className="h-10 w-10 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">ยังไม่มีค่าใช้จ่าย</p>
                            <p className="text-xs mt-1">กดปุ่ม "เพิ่ม" เพื่อเบิกค่าใช้จ่าย</p>
                        </div>
                    ) : (
                        initialExpenses.map(exp => {
                            const status = STATUS_MAP[exp.status] || STATUS_MAP.draft;
                            return (
                                <div key={exp.id} className="flex items-center gap-3 px-4 py-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm text-slate-900 truncate">{exp.category}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${status.color}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                        {exp.description && exp.description !== exp.category && (
                                            <p className="text-xs text-slate-500 truncate mt-0.5">{exp.description}</p>
                                        )}
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            {new Date(exp.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                        </p>
                                    </div>
                                    <span className="text-sm font-semibold text-slate-900 flex-shrink-0">
                                        ฿{exp.amount.toLocaleString()}
                                    </span>
                                    {exp.status === 'draft' || exp.status === 'approved' ? (
                                        <button
                                            onClick={() => handleDelete(exp.id)}
                                            disabled={isPending}
                                            className="text-red-400 hover:text-red-500 p-1 rounded transition-colors flex-shrink-0"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    ) : (
                                        <div className="w-[22px]" /> /* spacer */
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Expense Total */}
                {initialExpenses.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                        <span className="text-sm text-slate-600">รวมค่าใช้จ่าย</span>
                        <span className="text-sm font-bold text-purple-600">฿{totalExpenses.toLocaleString()}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
