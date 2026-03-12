'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Pencil, Check, X } from 'lucide-react';
import { updateInvoiceNumber } from '@/actions/invoice-actions';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/shared';

interface Props {
    invoiceId: string;
    currentNumber: string;
}

export function EditInvoiceNumber({ invoiceId, currentNumber }: Props) {
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(currentNumber);
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();

    const handleSave = () => {
        if (!value.trim()) {
            setError('กรุณาระบุเลข Invoice');
            return;
        }
        if (value.trim() === currentNumber) {
            setEditing(false);
            return;
        }

        setError('');
        startTransition(async () => {
            try {
                await updateInvoiceNumber(invoiceId, value.trim());
                setEditing(false);
                router.refresh();
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
            }
        });
    };

    const handleCancel = () => {
        setValue(currentNumber);
        setError('');
        setEditing(false);
    };

    if (!editing) {
        return (
            <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors group"
            >
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">ออกแล้ว — {currentNumber}</span>
                <Pencil className="h-3.5 w-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
        );
    }

    return (
        <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => { setValue(e.target.value); setError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
                    className="px-3 py-2 text-sm border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 w-56"
                    placeholder="เลข Invoice"
                    autoFocus
                    disabled={isPending}
                />
                <button
                    onClick={handleSave}
                    disabled={isPending}
                    className="p-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    title="บันทึก"
                >
                    {isPending ? <Spinner size="xs" /> : <Check className="h-4 w-4" />}
                </button>
                <button
                    onClick={handleCancel}
                    disabled={isPending}
                    className="p-2 text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    title="ยกเลิก"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            {error && (
                <p className="text-xs text-red-500 font-medium">{error}</p>
            )}
        </div>
    );
}
