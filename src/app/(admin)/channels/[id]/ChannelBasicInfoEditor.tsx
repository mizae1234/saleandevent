"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Pencil, Save, X, Search, ChevronDown } from "lucide-react";
import { Spinner } from "@/components/shared";
import { useRouter } from "next/navigation";

interface Customer {
    id: string;
    code: string;
    name: string;
}

interface Props {
    channelId: string;
    name: string;
    location: string;
    responsiblePersonName: string | null;
    phone: string | null;
    startDate: string | null;
    endDate: string | null;
    salesTarget: number | null;
    customerId: string | null;
}

export default function ChannelBasicInfoEditor(props: Props) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Form state
    const [name, setName] = useState(props.name);
    const [location, setLocation] = useState(props.location);
    const [responsiblePersonName, setResponsiblePersonName] = useState(props.responsiblePersonName || "");
    const [phone, setPhone] = useState(props.phone || "");
    const [startDate, setStartDate] = useState(props.startDate || "");
    const [endDate, setEndDate] = useState(props.endDate || "");
    const [salesTarget, setSalesTarget] = useState(props.salesTarget?.toString() || "");
    const [customerId, setCustomerId] = useState(props.customerId || "");

    // Customer dropdown state
    const [customerList, setCustomerList] = useState<Customer[]>([]);
    const [customerSearch, setCustomerSearch] = useState("");
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const customerDropdownRef = useRef<HTMLDivElement>(null);

    // Load customers when entering edit mode
    useEffect(() => {
        if (isEditing && customerList.length === 0) {
            fetch("/api/customers").then(r => r.json()).then(setCustomerList).catch(() => { });
        }
    }, [isEditing]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
                setShowCustomerDropdown(false);
            }
        }
        if (showCustomerDropdown) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showCustomerDropdown]);

    const selectedCustomer = customerList.find(c => c.id === customerId);
    const filteredCustomers = customerList.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.code.toLowerCase().includes(customerSearch.toLowerCase())
    );

    const handleCancel = () => {
        setName(props.name);
        setLocation(props.location);
        setResponsiblePersonName(props.responsiblePersonName || "");
        setPhone(props.phone || "");
        setStartDate(props.startDate || "");
        setEndDate(props.endDate || "");
        setSalesTarget(props.salesTarget?.toString() || "");
        setCustomerId(props.customerId || "");
        setIsEditing(false);
    };

    const handleSave = () => {
        startTransition(async () => {
            try {
                const res = await fetch(`/api/channels/${props.channelId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        location,
                        responsiblePersonName: responsiblePersonName || null,
                        phone: phone || null,
                        startDate: startDate || null,
                        endDate: endDate || null,
                        salesTarget: salesTarget ? parseFloat(salesTarget) : null,
                        customerId: customerId || null,
                    }),
                });
                if (res.ok) {
                    setIsEditing(false);
                    router.refresh();
                }
            } catch (err) {
                console.error("Failed to update:", err);
            }
        });
    };

    const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:outline-none transition-colors";

    if (!isEditing) {
        return (
            <div className="bg-white rounded-xl p-4 space-y-3 text-sm shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">ข้อมูลพื้นฐาน</h3>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 px-2 py-1 rounded-md hover:bg-teal-50 transition-colors"
                    >
                        <Pencil className="h-3 w-3" /> แก้ไข
                    </button>
                </div>
                {selectedCustomer && (
                    <div className="flex justify-between">
                        <span className="text-slate-500">ลูกค้า</span>
                        <span className="text-slate-900 font-medium">{selectedCustomer.code} — {selectedCustomer.name}</span>
                    </div>
                )}
                {props.responsiblePersonName && (
                    <div className="flex justify-between">
                        <span className="text-slate-500">ผู้รับผิดชอบ</span>
                        <span className="text-slate-900 font-medium">{props.responsiblePersonName}</span>
                    </div>
                )}
                {props.phone && (
                    <div className="flex justify-between">
                        <span className="text-slate-500">เบอร์โทร</span>
                        <span className="text-slate-900">{props.phone}</span>
                    </div>
                )}
                {props.startDate && (
                    <div className="flex justify-between">
                        <span className="text-slate-500">วันที่</span>
                        <span className="text-slate-900">{props.startDate}{props.endDate ? ` — ${props.endDate}` : ''}</span>
                    </div>
                )}
                {props.salesTarget && (
                    <div className="flex justify-between">
                        <span className="text-slate-500">เป้ายอดขาย</span>
                        <span className="text-slate-900">฿{props.salesTarget.toLocaleString()}</span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl p-4 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-teal-200">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">แก้ไขข้อมูลพื้นฐาน</h3>
                <div className="flex items-center gap-1">
                    <button onClick={handleCancel} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-md hover:bg-slate-50 transition-colors">
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">ชื่อ</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">สถานที่</label>
                    <input type="text" value={location} onChange={e => setLocation(e.target.value)} className={inputClass} />
                </div>
                {/* Customer Dropdown */}
                <div ref={customerDropdownRef} className="relative">
                    <label className="block text-xs font-medium text-slate-600 mb-1">ลูกค้า</label>
                    <button
                        type="button"
                        onClick={() => { setShowCustomerDropdown(!showCustomerDropdown); setCustomerSearch(''); }}
                        className="w-full flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2 text-sm text-left focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:outline-none bg-white"
                    >
                        {selectedCustomer ? (
                            <span className="text-slate-900">{selectedCustomer.code} — {selectedCustomer.name}</span>
                        ) : (
                            <span className="text-slate-400">เลือกลูกค้า...</span>
                        )}
                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    </button>
                    {showCustomerDropdown && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
                            <div className="p-2 border-b border-slate-100">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="ค้นหาลูกค้า..."
                                        value={customerSearch}
                                        onChange={e => setCustomerSearch(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                <button type="button" onClick={() => { setCustomerId(''); setShowCustomerDropdown(false); }}
                                    className="w-full px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-50">— ไม่ระบุ —</button>
                                {filteredCustomers.map(c => (
                                    <button key={c.id} type="button"
                                        onClick={() => { setCustomerId(c.id); setShowCustomerDropdown(false); setCustomerSearch(''); }}
                                        className={`w-full px-3 py-2 text-left text-sm hover:bg-teal-50 ${customerId === c.id ? 'bg-teal-50 text-teal-700' : 'text-slate-900'}`}
                                    >
                                        <span className="font-medium text-teal-600">{c.code}</span>
                                        <span className="ml-2">{c.name}</span>
                                    </button>
                                ))}
                                {filteredCustomers.length === 0 && (
                                    <div className="px-3 py-3 text-xs text-center text-slate-400">ไม่พบลูกค้า</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">วันเริ่ม</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">วันสิ้นสุด</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">เป้ายอดขาย (บาท)</label>
                    <input type="number" onFocus={(e) => e.target.select()} value={salesTarget} onChange={e => setSalesTarget(e.target.value)} placeholder="0" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">ผู้รับผิดชอบ</label>
                        <input type="text" value={responsiblePersonName} onChange={e => setResponsiblePersonName(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">เบอร์โทร</label>
                        <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} />
                    </div>
                </div>
            </div>

            <div className="flex gap-2 pt-1">
                <button
                    onClick={handleSave}
                    disabled={isPending || !name.trim() || !location.trim()}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 text-xs font-medium transition-colors"
                >
                    {isPending ? <Spinner size="xs" /> : <Save className="h-3.5 w-3.5" />}
                    {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
                <button onClick={handleCancel} className="px-3 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    ยกเลิก
                </button>
            </div>
        </div>
    );
}
