"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { Save, ArrowLeft, Loader2, Users, Star, Package, Search, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateChannelWithDetails } from "@/actions/channel-actions";

type Staff = { id: string; name: string; phone: string | null; role: string };
type Customer = { id: string; code: string; name: string };

interface StockRequestData {
    id: string;
    requestType: string;
    requestedTotalQuantity: number;
    status: string;
    notes: string | null;
    createdAt: string;
}

interface ChannelData {
    id: string;
    name: string;
    location: string;
    code: string;
    type: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    salesTarget: number | null;
    responsiblePersonName: string | null;
    phone: string | null;
    customerId: string | null;
    staff: { staffId: string; isMain: boolean }[];
    stockRequests: StockRequestData[];
}

export default function EditEventClient({ channelId }: { channelId: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    // Form state
    const [name, setName] = useState("");
    const [location, setLocation] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [salesTarget, setSalesTarget] = useState("");
    const [responsiblePersonName, setResponsiblePersonName] = useState("");
    const [phone, setPhone] = useState("");
    const [channelType, setChannelType] = useState("EVENT");
    const [customerId, setCustomerId] = useState("");

    // Customer state
    const [customerList, setCustomerList] = useState<Customer[]>([]);
    const [customerSearch, setCustomerSearch] = useState("");
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const customerDropdownRef = useRef<HTMLDivElement>(null);

    // Staff state
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [selectedStaff, setSelectedStaff] = useState<{ staffId: string; isMain: boolean }[]>([]);
    const [stockRequests, setStockRequests] = useState<StockRequestData[]>([]);
    const [initialQty, setInitialQty] = useState("");
    const [staffSearch, setStaffSearch] = useState("");

    // Close customer dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
                setShowCustomerDropdown(false);
            }
        }
        if (showCustomerDropdown) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showCustomerDropdown]);

    useEffect(() => {
        async function load() {
            try {
                const [channelRes, staffRes, customerRes] = await Promise.all([
                    fetch(`/api/channels/${channelId}`),
                    fetch(`/api/staff`),
                    fetch(`/api/customers`),
                ]);
                if (channelRes.ok) {
                    const data: ChannelData = await channelRes.json();
                    setName(data.name);
                    setLocation(data.location);
                    setChannelType(data.type);
                    setStartDate(data.startDate?.split('T')[0] || "");
                    setEndDate(data.endDate?.split('T')[0] || "");
                    setSalesTarget(data.salesTarget?.toString() || "");
                    setResponsiblePersonName(data.responsiblePersonName || "");
                    setPhone(data.phone || "");
                    setCustomerId(data.customerId || "");
                    setSelectedStaff(data.staff);
                    setStockRequests(data.stockRequests || []);
                    const initialReq = (data.stockRequests || []).find((r: StockRequestData) => r.requestType === 'INITIAL');
                    if (initialReq) {
                        setInitialQty(initialReq.requestedTotalQuantity.toString());
                    }
                }
                if (staffRes.ok) {
                    const data = await staffRes.json();
                    setStaffList(data);
                }
                if (customerRes.ok) {
                    const data = await customerRes.json();
                    setCustomerList(data);
                }
            } catch (err) {
                setError("Failed to load data");
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, [channelId]);

    const selectedCustomer = customerList.find(c => c.id === customerId);
    const filteredCustomers = customerList.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.code.toLowerCase().includes(customerSearch.toLowerCase())
    );

    const handleSave = () => {
        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.set("name", name);
                formData.set("location", location);
                if (startDate) formData.set("startDate", startDate);
                if (endDate) formData.set("endDate", endDate);
                if (salesTarget) formData.set("salesTarget", salesTarget);
                if (responsiblePersonName) formData.set("responsiblePersonName", responsiblePersonName);
                if (phone) formData.set("phone", phone);
                if (customerId) formData.set("customerId", customerId);
                formData.set("staff", JSON.stringify(selectedStaff));
                if (initialQty) formData.set("initialQuantity", initialQty);

                await updateChannelWithDetails(channelId, formData);
                router.push(`/channels/${channelId}`);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error");
            }
        });
    };

    const toggleStaff = (staffId: string) => {
        setSelectedStaff(prev => {
            const exists = prev.find(s => s.staffId === staffId);
            if (exists) return prev.filter(s => s.staffId !== staffId);
            return [...prev, { staffId, isMain: prev.length === 0 }];
        });
    };

    const toggleMain = (staffId: string) => {
        setSelectedStaff(prev => prev.map(s => ({ ...s, isMain: s.staffId === staffId })));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-6">
            <div>
                <Link href={`/channels/${channelId}`} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
                    <ArrowLeft className="h-4 w-4" /> กลับ
                </Link>
                <h1 className="text-xl font-bold text-slate-900">แก้ไข Sales Channel</h1>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>
            )}

            {/* Basic Info */}
            <div className="bg-white rounded-xl p-5 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                <h2 className="font-semibold text-slate-900">ข้อมูลพื้นฐาน</h2>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:outline-none transition-colors" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">สถานที่</label>
                    <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:outline-none transition-colors" />
                </div>

                {/* Customer Dropdown */}
                <div ref={customerDropdownRef} className="relative">
                    <label className="block text-sm font-medium text-slate-700 mb-1">ลูกค้า</label>
                    <button
                        type="button"
                        onClick={() => {
                            setShowCustomerDropdown(!showCustomerDropdown);
                            setCustomerSearch('');
                        }}
                        className="w-full flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-left focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:outline-none transition-colors bg-white"
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
                                <button
                                    type="button"
                                    onClick={() => { setCustomerId(''); setShowCustomerDropdown(false); }}
                                    className="w-full px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-50 transition-colors"
                                >
                                    — ไม่ระบุ —
                                </button>
                                {filteredCustomers.map(c => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => {
                                            setCustomerId(c.id);
                                            setShowCustomerDropdown(false);
                                            setCustomerSearch('');
                                        }}
                                        className={`w-full px-3 py-2 text-left text-sm hover:bg-teal-50 transition-colors ${customerId === c.id ? 'bg-teal-50 text-teal-700' : 'text-slate-900'}`}
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

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">วันเริ่ม</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:outline-none transition-colors" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">วันสิ้นสุด</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:outline-none transition-colors" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">เป้ายอดขาย (บาท)</label>
                    <input type="number" onFocus={(e) => e.target.select()} value={salesTarget} onChange={e => setSalesTarget(e.target.value)} placeholder="0" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:outline-none transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">ผู้รับผิดชอบ</label>
                        <input type="text" value={responsiblePersonName} onChange={e => setResponsiblePersonName(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:outline-none transition-colors" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทร</label>
                        <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:outline-none transition-colors" />
                    </div>
                </div>
            </div>

            {/* Stock Request Info */}
            <div className="bg-white rounded-xl p-5 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Package className="h-4 w-4 text-teal-600" /> คำขอสินค้า
                </h2>
                {stockRequests.length > 0 ? (
                    <div className="space-y-3">
                        {stockRequests.map(req => (
                            <div key={req.id} className="bg-slate-50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.requestType === 'INITIAL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                            }`}>
                                            {req.requestType === 'INITIAL' ? 'เริ่มต้น' : 'เพิ่มเติม'}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
                                            req.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                                req.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                                                    'bg-slate-100 text-slate-600'
                                            }`}>
                                            {req.status === 'submitted' ? 'รออนุมัติ' :
                                                req.status === 'approved' ? 'อนุมัติแล้ว' :
                                                    req.status === 'draft' ? 'แบบร่าง' : req.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-500">จำนวนที่ขอ</span>
                                    <span className="text-lg font-bold text-slate-900">{req.requestedTotalQuantity.toLocaleString()} ชิ้น</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-400">ยังไม่มีคำขอสินค้า</p>
                )}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนสินค้าที่ขอ (ชิ้น)</label>
                    <input type="number" onFocus={(e) => e.target.select()} value={initialQty} onChange={e => setInitialQty(e.target.value)} placeholder="0" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:outline-none transition-colors" />
                </div>
            </div>

            {/* Staff */}
            <div className="bg-white rounded-xl p-5 space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-teal-600" /> พนักงาน ({selectedStaff.length})
                </h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={staffSearch}
                        onChange={e => setStaffSearch(e.target.value)}
                        placeholder="ค้นหาชื่อพนักงาน..."
                        className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:outline-none transition-colors"
                    />
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {staffList
                        .filter(s => s.name.toLowerCase().includes(staffSearch.toLowerCase()))
                        .map(s => {
                            const isSelected = selectedStaff.some(ss => ss.staffId === s.id);
                            const isMain = selectedStaff.find(ss => ss.staffId === s.id)?.isMain;
                            return (
                                <div key={s.id}
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'border-teal-300 bg-teal-50' : 'border-slate-200 hover:border-slate-300'}`}
                                    onClick={() => toggleStaff(s.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                            {s.name.charAt(0)}
                                        </div>
                                        <span className="text-sm font-medium text-slate-900">{s.name}</span>
                                    </div>
                                    {isSelected && (
                                        <button type="button" onClick={e => { e.stopPropagation(); toggleMain(s.id); }}
                                            className={`text-xs px-2 py-0.5 rounded-full ${isMain ? 'bg-amber-100 text-amber-700 font-semibold' : 'bg-slate-100 text-slate-500'}`}>
                                            {isMain ? '★ หัวหน้า' : 'ตั้งเป็นหัวหน้า'}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* Save */}
            <button
                onClick={handleSave}
                disabled={isPending || !name.trim() || !location.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
                <Save className="h-4 w-4" /> {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
        </div>
    );
}
