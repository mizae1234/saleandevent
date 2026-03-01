'use client';

import { useState, useTransition } from 'react';
import { Banknote, Receipt, Save, Loader2, Check, Plus, X, Trash2, Tag, ChevronDown } from 'lucide-react';
import { updateEmployeeCompensation, addChannelExpense, removeChannelExpense } from '@/actions/channel';
import { useRouter } from 'next/navigation';

const EXPENSE_CATEGORIES = [
    "ค่าเดินทาง", "ค่าที่พัก", "ค่าเบี้ยเลี้ยง", "ค่าอาหาร",
    "ค่าอุปกรณ์สิ้นเปลือง", "ค่าขนส่ง", "อื่นๆ",
];

interface ExpenseItem {
    id: string;
    category: string;
    amount: number;
    description: string | null;
    createdAt: string;
}

interface Props {
    channelId: string;
    staffId: string;
    wage: {
        dailyRate: number;
        daysWorked: number;
        commission: number;
        totalWage: number;
    };
    expenses: ExpenseItem[];
    totalExpense: number;
    grandTotal: number;
}

export default function StaffPayrollEditor({ channelId, staffId, wage, expenses, totalExpense, grandTotal }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Compensation editing
    const [editingWage, setEditingWage] = useState(false);
    const [daysInput, setDaysInput] = useState(String(wage.daysWorked));
    const [commissionInput, setCommissionInput] = useState(String(wage.commission));
    const [saved, setSaved] = useState(false);

    // Expense adding
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseDesc, setExpenseDesc] = useState('');
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);

    const currentDays = editingWage ? (parseInt(daysInput) || 0) : wage.daysWorked;
    const currentCommission = editingWage ? (parseFloat(commissionInput) || 0) : wage.commission;
    const previewWage = (wage.dailyRate * currentDays) + currentCommission;
    const previewGrand = previewWage + totalExpense;

    const handleSaveCompensation = () => {
        const days = parseInt(daysInput);
        const commission = parseFloat(commissionInput);
        if (isNaN(days) || days < 0) return;
        if (isNaN(commission) || commission < 0) return;

        startTransition(async () => {
            await updateEmployeeCompensation(channelId, staffId, { daysWorked: days, commission });
            setEditingWage(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            router.refresh();
        });
    };

    const handleAddExpense = (e: React.FormEvent) => {
        e.preventDefault();
        const parsed = parseFloat(expenseAmount);
        if (!parsed || parsed <= 0) return;

        startTransition(async () => {
            await addChannelExpense(channelId, {
                category,
                amount: parsed,
                description: expenseDesc || category,
            }, staffId);
            setExpenseAmount('');
            setExpenseDesc('');
            setShowExpenseForm(false);
            router.refresh();
        });
    };

    const handleDeleteExpense = (expenseId: string) => {
        startTransition(async () => {
            await removeChannelExpense(expenseId, channelId);
            router.refresh();
        });
    };

    return (
        <div className="space-y-6">
            {/* Wage Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                        <Banknote className="h-4 w-4" /> สรุปค่าแรง
                    </h3>
                    {!editingWage && (
                        <button
                            onClick={() => { setEditingWage(true); setDaysInput(String(wage.daysWorked)); setCommissionInput(String(wage.commission)); }}
                            className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
                        >
                            แก้ไข
                        </button>
                    )}
                    {saved && (
                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                            <Check className="h-3 w-3" /> บันทึกแล้ว
                        </span>
                    )}
                </div>
                <div className="p-5 space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-500">ค่าแรง/วัน</span>
                        <span className="text-slate-800">฿{wage.dailyRate.toLocaleString()}</span>
                    </div>

                    {editingWage ? (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">จำนวนวันทำงาน</label>
                                    <input
                                        type="number"
                                        onFocus={(e) => e.target.select()}
                                        value={daysInput}
                                        onChange={e => setDaysInput(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        min="0"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">คอมมิชชั่น</label>
                                    <input
                                        type="number"
                                        onFocus={(e) => e.target.select()}
                                        value={commissionInput}
                                        onChange={e => setCommissionInput(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-slate-500">Preview: ฿{previewWage.toLocaleString()}</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setEditingWage(false)}
                                        className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={handleSaveCompensation}
                                        disabled={isPending}
                                        className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                                    >
                                        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                        บันทึก
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex justify-between">
                                <span className="text-slate-500">จำนวนวันทำงาน</span>
                                <span className="text-slate-800 font-medium">{wage.daysWorked} วัน</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-slate-100">
                                <span className="text-slate-600 font-medium">ค่าแรงรวม</span>
                                <span className="text-slate-900 font-bold">฿{wage.totalWage.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">คอมมิชชั่น</span>
                                <span className="text-purple-700 font-medium">฿{wage.commission.toLocaleString()}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Expenses Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="px-5 py-3 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                        <Receipt className="h-4 w-4" /> ค่าใช้จ่ายที่เบิก
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                            {expenses.length} รายการ
                        </span>
                    </h3>
                    {!showExpenseForm && (
                        <button
                            onClick={() => setShowExpenseForm(true)}
                            className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700"
                        >
                            <Plus className="h-3.5 w-3.5" /> เพิ่ม
                        </button>
                    )}
                </div>

                {/* Add Expense Form */}
                {showExpenseForm && (
                    <form onSubmit={handleAddExpense} className="p-4 bg-orange-50/50 border-b border-slate-100">
                        <div className="space-y-3">
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                                    className="w-full flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-200 text-sm"
                                >
                                    <div className="flex items-center gap-2">
                                        <Tag className="h-4 w-4 text-slate-400" />
                                        <span>{category}</span>
                                    </div>
                                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showCategoryPicker ? 'rotate-180' : ''}`} />
                                </button>
                                {showCategoryPicker && (
                                    <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                                        {EXPENSE_CATEGORIES.map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => { setCategory(cat); setShowCategoryPicker(false); }}
                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-orange-50 ${category === cat ? 'bg-orange-50 text-orange-700 font-medium' : 'text-slate-700'}`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
                                    <input
                                        type="number"
                                        onFocus={(e) => e.target.select()}
                                        placeholder="จำนวนเงิน"
                                        value={expenseAmount}
                                        onChange={e => setExpenseAmount(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 bg-white rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                        required min="1" step="0.01" autoFocus
                                    />
                                </div>
                                <input
                                    type="text"
                                    placeholder="รายละเอียด"
                                    value={expenseDesc}
                                    onChange={e => setExpenseDesc(e.target.value)}
                                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setShowExpenseForm(false)}
                                    className="flex-1 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                                    ยกเลิก
                                </button>
                                <button type="submit" disabled={isPending || !expenseAmount}
                                    className="flex-1 py-2 text-xs font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-1">
                                    {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                                    เพิ่ม
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {expenses.length === 0 && !showExpenseForm ? (
                    <div className="text-center py-8 text-slate-400 text-sm">ไม่มีค่าใช้จ่าย</div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {expenses.map(exp => (
                            <div key={exp.id} className="flex items-center justify-between px-5 py-3 group">
                                <div>
                                    <p className="text-sm font-medium text-slate-900">{exp.category}</p>
                                    {exp.description && exp.description !== exp.category && (
                                        <p className="text-xs text-slate-500 mt-0.5">{exp.description}</p>
                                    )}
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                        {new Date(exp.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-900">
                                        ฿{exp.amount.toLocaleString()}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteExpense(exp.id)}
                                        disabled={isPending}
                                        className="text-red-400 hover:text-red-600 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="ลบ"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {expenses.length > 0 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                        <span className="text-sm text-slate-600">รวมค่าใช้จ่าย</span>
                        <span className="text-sm font-bold text-orange-600">฿{totalExpense.toLocaleString()}</span>
                    </div>
                )}
            </div>

            {/* Grand Total */}
            <div className="bg-gradient-to-r from-emerald-50 to-white rounded-xl border border-emerald-200 p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-emerald-600 font-semibold">ยอดโอนทั้งหมด</p>
                        <p className="text-xs text-slate-400 mt-0.5">ค่าแรง + คอม + ค่าใช้จ่าย</p>
                    </div>
                    <p className="text-3xl font-bold text-emerald-700">
                        ฿{(editingWage ? previewGrand : grandTotal).toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    );
}
