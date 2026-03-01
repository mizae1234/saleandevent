"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Users, Plus, X, Search } from "lucide-react";
import { addStaffToChannel, removeStaffFromChannel } from "@/actions/channel";
import { useToast } from "@/components/ui/toast";
import { Spinner, ConfirmDialog } from "@/components/shared";

interface StaffAssignment {
    id: string; // channelStaff id
    isMain: boolean;
    staff: {
        id: string;
        name: string;
    };
}

interface AvailableStaff {
    id: string;
    name: string;
    code: string | null;
    role: string;
}

interface Props {
    channelId: string;
    staff: StaffAssignment[];
}

export function StaffManager({ channelId, staff }: Props) {
    const [showAdd, setShowAdd] = useState(false);
    const [search, setSearch] = useState("");
    const [availableStaff, setAvailableStaff] = useState<AvailableStaff[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [removing, setRemoving] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { toastError } = useToast();

    // Fetch available staff when opening the picker
    useEffect(() => {
        if (showAdd && availableStaff.length === 0) {
            setLoadingStaff(true);
            fetch("/api/staff/available")
                .then(res => res.json())
                .then(data => setAvailableStaff(data))
                .catch(() => { })
                .finally(() => setLoadingStaff(false));
        }
    }, [showAdd, availableStaff.length]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowAdd(false);
                setSearch("");
            }
        }
        if (showAdd) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [showAdd]);

    const assignedIds = new Set(staff.map(cs => cs.staff.id));
    const filtered = availableStaff
        .filter(s => !assignedIds.has(s.id))
        .filter(s => s.name.toLowerCase().includes(search.toLowerCase()) ||
            (s.code && s.code.toLowerCase().includes(search.toLowerCase())));

    const handleAdd = (staffId: string) => {
        startTransition(async () => {
            try {
                await addStaffToChannel(channelId, staffId);
                setShowAdd(false);
                setSearch("");
                // Re-fetch available staff to update the list
                setAvailableStaff([]);
            } catch (err) {
                toastError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
            }
        });
    };

    const handleRemove = (channelStaffId: string) => {
        setRemoving(channelStaffId);
        startTransition(async () => {
            try {
                await removeStaffFromChannel(channelId, channelStaffId);
            } catch (err) {
                toastError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
            } finally {
                setRemoving(null);
            }
        });
    };

    return (
        <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-teal-600" /> พนักงาน ({staff.length})
                </h3>
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => {
                            setShowAdd(!showAdd);
                            if (!showAdd) setSearch("");
                        }}
                        className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium px-2 py-1 rounded-lg hover:bg-teal-50 transition-colors"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        เพิ่ม
                    </button>

                    {showAdd && (
                        <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
                            {/* Search */}
                            <div className="p-2 border-b border-slate-100">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="ค้นชื่อพนักงาน..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Staff list */}
                            <div className="max-h-48 overflow-y-auto">
                                {loadingStaff ? (
                                    <div className="p-4 text-center">
                                        <Spinner size="sm" />
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div className="p-3 text-xs text-center text-slate-400">
                                        {search ? "ไม่พบพนักงาน" : "ไม่มีพนักงานที่สามารถเพิ่มได้"}
                                    </div>
                                ) : (
                                    filtered.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => handleAdd(s.id)}
                                            disabled={isPending}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-teal-50 transition-colors disabled:opacity-50"
                                        >
                                            <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                                                {s.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm text-slate-900 truncate">{s.name}</p>
                                                {s.code && (
                                                    <p className="text-[10px] text-slate-400">{s.code}</p>
                                                )}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Staff list */}
            <div className="space-y-2">
                {staff.map(cs => (
                    <div key={cs.id} className="flex items-center gap-2 group">
                        <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {cs.staff.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{cs.staff.name}</p>
                        </div>
                        {cs.isMain && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">หัวหน้า</span>
                        )}
                        <ConfirmDialog
                            trigger={
                                <button
                                    disabled={removing === cs.id || isPending}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                                    title="ลบพนักงาน"
                                >
                                    {removing === cs.id ? (
                                        <Spinner size="xs" />
                                    ) : (
                                        <X className="h-3.5 w-3.5" />
                                    )}
                                </button>
                            }
                            title="ลบพนักงาน"
                            message={`ยืนยันลบ ${cs.staff.name} ออกจากช่องทางนี้?`}
                            confirmText="ลบ"
                            variant="danger"
                            onConfirm={() => handleRemove(cs.id)}
                        />
                    </div>
                ))}
                {staff.length === 0 && (
                    <p className="text-sm text-slate-400">ยังไม่มีพนักงาน</p>
                )}
            </div>
        </div>
    );
}
