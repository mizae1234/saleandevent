"use client";

import { useState, useTransition } from "react";
import { Plus, Receipt, Trash2, X, Tag, Clock, ChevronDown, CalendarDays, Save, Check, Send, CheckCircle2, Banknote, Lock, Circle, Paperclip, Upload, FileText, Image as ImageIcon } from "lucide-react";
import { Spinner } from "@/components/shared";
import { addChannelExpense, removeChannelExpense, updateEmployeeCompensation, submitPayroll, deletePayrollAttachment } from "@/actions/channel";
import { useRouter } from "next/navigation";



interface ExpenseItem {
    id: string;
    category: string;
    amount: number;
    description: string | null;
    status: string;
    createdAt: string;
}

interface AttachmentItem {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
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
    categories: string[];
    startDate: string | null;
    endDate: string | null;
    expenses: ExpenseItem[];
    wage: WageInfo;
    isSubmitted: boolean;
    submittedAt: string | null;
    isWagePaid: boolean;
    wagePaidAt: string | null;
    isCommissionPaid: boolean;
    commissionPaidAt: string | null;
    attachments: AttachmentItem[];
}

function formatDate(isoString: string) {
    return new Date(isoString).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
    });
}

function formatDateTime(isoString: string) {
    return new Date(isoString).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function PayrollClient({ channelId, staffId, categories, startDate, endDate, expenses: initialExpenses, wage, isSubmitted, submittedAt, isWagePaid, wagePaidAt, isCommissionPaid, commissionPaidAt, attachments }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showForm, setShowForm] = useState(false);
    const [category, setCategory] = useState(categories[0] || '');
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    // Compensation editing (days + commission)
    const [editing, setEditing] = useState(false);
    const [daysInput, setDaysInput] = useState(String(wage.daysWorked));
    const [commissionInput, setCommissionInput] = useState(String(wage.commission));
    const [saved, setSaved] = useState(false);

    // Lock editing when submitted
    const locked = isSubmitted;

    const currentDays = editing ? (parseInt(daysInput) || 0) : wage.daysWorked;
    const currentCommission = editing ? (parseFloat(commissionInput) || 0) : wage.commission;
    const previewWage = (wage.dailyRate * currentDays) + currentCommission;

    const totalExpenses = initialExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const grandTotal = wage.wageSummary + totalExpenses;

    const handleStartEdit = () => {
        if (locked) return;
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
            }, staffId);
            setAmount("");
            setDescription("");
            setShowForm(false);
            router.refresh();
        });
    };

    const handleDelete = (expenseId: string) => {
        if (locked) return;
        startTransition(async () => {
            await removeChannelExpense(expenseId, channelId);
            router.refresh();
        });
    };

    const handleSubmitPayroll = () => {
        startTransition(async () => {
            await submitPayroll(channelId, staffId);
            setShowConfirmSubmit(false);
            router.refresh();
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setUploadProgress(`กำลังอัปโหลด ${files.length} ไฟล์...`);

        try {
            const formData = new FormData();
            formData.append('channelId', channelId);
            formData.append('staffId', staffId);
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }

            const res = await fetch('/api/payroll/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Upload failed');
            }

            setUploadProgress('');
            router.refresh();
        } catch (error) {
            console.error('Upload error:', error);
            setUploadProgress('อัปโหลดล้มเหลว');
            setTimeout(() => setUploadProgress(''), 3000);
        } finally {
            setUploading(false);
            // Reset input
            e.target.value = '';
        }
    };

    const handleDeleteAttachment = (attachmentId: string) => {
        startTransition(async () => {
            await deletePayrollAttachment(attachmentId);
            router.refresh();
        });
    };

    const isImage = (type: string) => type.startsWith('image/');
    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="space-y-4">
            {/* ── Payment Status ── */}
            <div className="space-y-2">
                {/* Submit status */}
                {isSubmitted ? (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-emerald-800">ส่งเบิกแล้ว</p>
                            {submittedAt && <p className="text-[11px] text-emerald-600">ส่งเมื่อ {formatDateTime(submittedAt)}</p>}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <Circle className="h-5 w-5 text-slate-400 flex-shrink-0" />
                        <p className="text-sm text-slate-500">ยังไม่ได้ส่งเบิก</p>
                    </div>
                )}

                {/* Wage payment status */}
                {isWagePaid ? (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-emerald-800">โอนค่าแรงแล้ว</p>
                            {wagePaidAt && <p className="text-[11px] text-emerald-600">{formatDateTime(wagePaidAt)}</p>}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
                        <p className="text-sm text-amber-700">ยังไม่โอนค่าแรง</p>
                    </div>
                )}

                {/* Commission payment status */}
                {isCommissionPaid ? (
                    <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                        <CheckCircle2 className="h-5 w-5 text-purple-600 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-purple-800">โอนค่าคอมแล้ว</p>
                            {commissionPaidAt && <p className="text-[11px] text-purple-600">{formatDateTime(commissionPaidAt)}</p>}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
                        <p className="text-sm text-amber-700">ยังไม่โอนค่าคอม</p>
                    </div>
                )}
            </div>

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
                    {!editing && !locked && (
                        <button
                            onClick={handleStartEdit}
                            className="text-[11px] text-blue-200 hover:text-white underline underline-offset-2 transition-colors"
                        >
                            แก้ไข
                        </button>
                    )}
                    {locked && (
                        <span className="text-[10px] text-blue-200 flex items-center gap-1">
                            <Lock className="h-3 w-3" /> ล็อคแล้ว
                        </span>
                    )}
                </div>

                {editing ? (
                    /* ── Edit Mode ── */
                    <div className="mt-2 space-y-2">
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

                        <div className="pt-2 border-t border-white/20 flex justify-between items-end">
                            <span className="text-blue-200 text-xs">รวมค่าแรง (preview)</span>
                            <span className="text-xl font-bold">฿{previewWage.toLocaleString()}</span>
                        </div>

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
                                {isPending ? <Spinner size="xs" /> : <Save className="h-3 w-3" />}
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
                    {!showForm && !locked && (
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
                {showForm && !locked && (
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
                                        {categories.map(cat => (
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
                                    onFocus={(e) => e.target.select()}
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
                                    {isPending ? <Spinner size="sm" /> : <Plus className="h-4 w-4" />}
                                    บันทึก
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {/* Expense List — no status badges */}
                <div className="divide-y divide-slate-50">
                    {initialExpenses.length === 0 && !showForm ? (
                        <div className="text-center py-8 text-slate-400">
                            <Receipt className="h-10 w-10 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">ยังไม่มีค่าใช้จ่าย</p>
                            <p className="text-xs mt-1">กดปุ่ม "เพิ่ม" เพื่อเบิกค่าใช้จ่าย</p>
                        </div>
                    ) : (
                        initialExpenses.map(exp => (
                            <div key={exp.id} className="flex items-center gap-3 px-4 py-3">
                                <div className="flex-1 min-w-0">
                                    <span className="font-medium text-sm text-slate-900 truncate">{exp.category}</span>
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
                                {!locked && (
                                    <button
                                        onClick={() => handleDelete(exp.id)}
                                        disabled={isPending}
                                        className="text-red-400 hover:text-red-500 p-1 rounded transition-colors flex-shrink-0"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        ))
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

            {/* ── Attachments Section ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <Paperclip className="h-5 w-5 text-teal-600" />
                        <h3 className="font-semibold text-slate-900">เอกสาร/รูปภาพแนบ</h3>
                        {attachments.length > 0 && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                {attachments.length}
                            </span>
                        )}
                    </div>
                    {!locked && (
                        <label className={`flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            <Upload className="h-4 w-4" />
                            {uploading ? 'กำลังอัปโหลด...' : 'แนบไฟล์'}
                            <input
                                type="file"
                                multiple
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={uploading}
                            />
                        </label>
                    )}
                </div>

                {uploadProgress && (
                    <div className="px-4 py-2 bg-teal-50 border-b border-teal-100">
                        <div className="flex items-center gap-2 text-sm text-teal-700">
                            <Spinner size="sm" />
                            <span>{uploadProgress}</span>
                        </div>
                    </div>
                )}

                {attachments.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <Paperclip className="h-10 w-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">ยังไม่มีไฟล์แนบ</p>
                        <p className="text-xs mt-1">กดปุ่ม "แนบไฟล์" เพื่ออัปโหลดรูปหรือเอกสาร</p>
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        {/* Images Grid */}
                        {attachments.filter(a => isImage(a.fileType)).length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                                {attachments.filter(a => isImage(a.fileType)).map(att => (
                                    <div key={att.id} className="relative group rounded-xl overflow-hidden border border-slate-200">
                                        <a href={att.fileUrl} target="_blank" rel="noopener noreferrer">
                                            <img
                                                src={att.fileUrl}
                                                alt={att.fileName}
                                                className="w-full h-40 object-cover hover:opacity-90 transition-opacity"
                                            />
                                        </a>
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                            <p className="text-[10px] text-white truncate">{att.fileName}</p>
                                        </div>
                                        {!locked && (
                                            <button
                                                onClick={() => handleDeleteAttachment(att.id)}
                                                disabled={isPending}
                                                className="absolute top-1.5 right-1.5 bg-black/50 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Non-image Files */}
                        {attachments.filter(a => !isImage(a.fileType)).map(att => (
                            <div key={att.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 group">
                                <div className="h-10 w-10 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                                    <FileText className="h-5 w-5 text-slate-500" />
                                </div>
                                <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate hover:text-teal-600 transition-colors">{att.fileName}</p>
                                    <p className="text-[10px] text-slate-400">{formatFileSize(att.fileSize)}</p>
                                </a>
                                {!locked && (
                                    <button
                                        onClick={() => handleDeleteAttachment(att.id)}
                                        disabled={isPending}
                                        className="text-red-400 hover:text-red-500 p-1 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Grand Total ── */}
            <div className="bg-gradient-to-r from-emerald-50 to-white rounded-2xl border border-emerald-200 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-emerald-600 font-medium">ยอดรวมทั้งหมด</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">ค่าแรง + ค่าใช้จ่าย</p>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700">฿{grandTotal.toLocaleString()}</p>
                </div>
            </div>

            {/* ── Submit / Status Section ── */}
            {
                !isSubmitted && (
                    <div className="space-y-3">
                        {!showConfirmSubmit ? (
                            <button
                                onClick={() => setShowConfirmSubmit(true)}
                                className="w-full py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                <Send className="h-4 w-4" />
                                ส่งเบิกค่าแรง
                            </button>
                        ) : (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                                <p className="text-sm font-semibold text-amber-800">ยืนยันส่งเบิกค่าแรง?</p>
                                <div className="text-xs text-amber-700 space-y-1">
                                    <p>• ค่าแรงรวม: ฿{wage.wageSummary.toLocaleString()}</p>
                                    <p>• ค่าใช้จ่ายเบิก: ฿{totalExpenses.toLocaleString()}</p>
                                    <p className="font-bold">• ยอดรวม: ฿{grandTotal.toLocaleString()}</p>
                                </div>
                                <p className="text-[11px] text-amber-600">หลังส่งเบิกแล้วจะไม่สามารถแก้ไขได้</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowConfirmSubmit(false)}
                                        className="flex-1 py-2.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={handleSubmitPayroll}
                                        disabled={isPending}
                                        className="flex-1 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1 transition-colors"
                                    >
                                        {isPending ? <Spinner size="xs" /> : <Send className="h-3 w-3" />}
                                        ยืนยันส่งเบิก
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    );
}
