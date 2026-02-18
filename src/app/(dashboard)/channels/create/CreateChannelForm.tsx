'use client';

import { useState } from 'react';
import { createChannelWithDetails } from '@/actions/channel-actions';
import { Package, MapPin, Calendar, Users, ChevronRight, Store, CalendarDays, Target, Phone, User, FileText, Hash, Search } from 'lucide-react';

interface Staff {
    id: string;
    name: string;
    role: string;
    phone: string | null;
}

interface Props {
    readonly staffList: Staff[];
}

export default function CreateChannelForm({ staffList }: Props) {
    const [type, setType] = useState<'EVENT' | 'BRANCH'>('EVENT');
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [salesTarget, setSalesTarget] = useState('');
    const [responsiblePersonName, setResponsiblePersonName] = useState('');
    const [phone, setPhone] = useState('');
    const [selectedStaff, setSelectedStaff] = useState<{ staffId: string; isMain: boolean }[]>([]);
    const [staffSearch, setStaffSearch] = useState("");
    const [initialQuantity, setInitialQuantity] = useState('');
    const [notes, setNotes] = useState('');

    const totalSteps = type === 'EVENT' ? 4 : 3;

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.set('type', type);
            formData.set('name', name);
            formData.set('location', location);
            if (startDate) formData.set('startDate', startDate);
            if (endDate) formData.set('endDate', endDate);
            if (salesTarget) formData.set('salesTarget', salesTarget);
            if (responsiblePersonName) formData.set('responsiblePersonName', responsiblePersonName);
            if (phone) formData.set('phone', phone);
            formData.set('staff', JSON.stringify(selectedStaff));
            if (initialQuantity) formData.set('initialQuantity', initialQuantity);
            if (notes) formData.set('notes', notes);

            await createChannelWithDetails(formData);
        } catch {
            setIsSubmitting(false);
        }
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

    const getStaffName = (staffId: string) => staffList.find(s => s.id === staffId)?.name || '';

    const canProceed = () => {
        if (step === 1) return name.trim() && location.trim();
        if (step === 2 && type === 'EVENT') return startDate && endDate;
        return true;
    };

    return (
        <div className="max-w-2xl mx-auto">
            {/* Progress */}
            <div className="flex items-center gap-2 mb-8">
                {Array.from({ length: totalSteps }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 flex-1">
                        <div className={`h-2 flex-1 rounded-full transition-colors ${i < step ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                    </div>
                ))}
            </div>

            {/* Step 1: Type & Basic Info */}
            {step === 1 && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-1">สร้าง Sales Channel ใหม่</h2>
                        <p className="text-sm text-slate-500">เลือกประเภทและกรอกข้อมูลพื้นฐาน</p>
                    </div>

                    {/* Type Selection */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setType('EVENT')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${type === 'EVENT' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                            <CalendarDays className={`h-6 w-6 mb-2 ${type === 'EVENT' ? 'text-indigo-600' : 'text-slate-400'}`} />
                            <p className="font-semibold text-slate-900">Event</p>
                            <p className="text-xs text-slate-500 mt-1">งานชั่วคราว มีวันเริ่ม-สิ้นสุด</p>
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('BRANCH')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${type === 'BRANCH' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                            <Store className={`h-6 w-6 mb-2 ${type === 'BRANCH' ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <p className="font-semibold text-slate-900">Branch</p>
                            <p className="text-xs text-slate-500 mt-1">สาขาถาวร ไม่มีวันสิ้นสุด</p>
                        </button>
                    </div>

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ *</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={type === 'EVENT' ? 'เช่น งาน Central Ladprao' : 'เช่น สาขาเซ็นทรัล'} className="w-full border-0 border-b border-slate-300 px-0 py-2 focus:border-indigo-500 focus:ring-0 text-slate-900 placeholder-slate-400" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">สถานที่ *</label>
                            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="เช่น เซ็นทรัล ลาดพร้าว ชั้น 2" className="w-full border-0 border-b border-slate-300 px-0 py-2 focus:border-indigo-500 focus:ring-0 text-slate-900 placeholder-slate-400" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ผู้รับผิดชอบ</label>
                                <input type="text" value={responsiblePersonName} onChange={e => setResponsiblePersonName(e.target.value)} placeholder="ชื่อ-นามสกุล" className="w-full border-0 border-b border-slate-300 px-0 py-2 focus:border-indigo-500 focus:ring-0 text-slate-900 placeholder-slate-400" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทร</label>
                                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="08x-xxx-xxxx" className="w-full border-0 border-b border-slate-300 px-0 py-2 focus:border-indigo-500 focus:ring-0 text-slate-900 placeholder-slate-400" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Event Details (EVENT only) or Staff (BRANCH) */}
            {step === 2 && type === 'EVENT' && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-1">รายละเอียด Event</h2>
                        <p className="text-sm text-slate-500">กำหนดวันที่และเป้าหมาย</p>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">วันเริ่ม *</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border-0 border-b border-slate-300 px-0 py-2 focus:border-indigo-500 focus:ring-0 text-slate-900" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">วันสิ้นสุด *</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border-0 border-b border-slate-300 px-0 py-2 focus:border-indigo-500 focus:ring-0 text-slate-900" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">เป้ายอดขาย (บาท)</label>
                            <input type="number" value={salesTarget} onChange={e => setSalesTarget(e.target.value)} placeholder="0" className="w-full border-0 border-b border-slate-300 px-0 py-2 focus:border-indigo-500 focus:ring-0 text-slate-900 placeholder-slate-400" />
                        </div>
                    </div>
                </div>
            )}

            {/* Staff Selection */}
            {((step === 2 && type === 'BRANCH') || (step === 3 && type === 'EVENT')) && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-1">เลือกพนักงาน</h2>
                        <p className="text-sm text-slate-500">เลือกพนักงานที่ประจำ ({selectedStaff.length} คน)</p>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={staffSearch}
                            onChange={e => setStaffSearch(e.target.value)}
                            placeholder="ค้นหาชื่อพนักงาน..."
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 focus:outline-none text-slate-900 placeholder-slate-400"
                        />
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {staffList
                            .filter(s => s.name.toLowerCase().includes(staffSearch.toLowerCase()))
                            .map(s => {
                                const isSelected = selectedStaff.some(ss => ss.staffId === s.id);
                                const isMain = selectedStaff.find(ss => ss.staffId === s.id)?.isMain;
                                return (
                                    <div key={s.id}
                                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${isSelected ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                                        onClick={() => toggleStaff(s.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                {s.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{s.name}</p>
                                                <p className="text-xs text-slate-500">{s.role} {s.phone && `· ${s.phone}`}</p>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); toggleMain(s.id); }}
                                                className={`text-xs px-2 py-1 rounded-full ${isMain ? 'bg-amber-100 text-amber-700 font-semibold' : 'bg-slate-100 text-slate-500 hover:bg-amber-50'}`}
                                            >
                                                {isMain ? '★ หัวหน้า' : 'ตั้งเป็นหัวหน้า'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* Stock Request (Final Step) */}
            {step === totalSteps && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-1">คำขอสินค้า</h2>
                        <p className="text-sm text-slate-500">ระบุจำนวนสินค้าที่ต้องการ (คลังจะเป็นผู้เลือก SKU)</p>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <Package className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-amber-800">ระบบคำขอสินค้าแบบใหม่</p>
                                <p className="text-xs text-amber-600 mt-1">ระบุเฉพาะจำนวนรวมที่ต้องการ ทางคลังจะเป็นผู้จัดสรร SKU ให้ผ่านไฟล์ Excel</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนสินค้าที่ต้องการ (ชิ้น)</label>
                        <input
                            type="number"
                            value={initialQuantity}
                            onChange={e => setInitialQuantity(e.target.value)}
                            placeholder="เช่น 500"
                            min="1"
                            className="w-full border-0 border-b-2 border-slate-300 px-0 py-3 text-2xl font-bold focus:border-indigo-500 focus:ring-0 text-slate-900 placeholder-slate-300"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="เช่น ต้องการเน้นสินค้าไซส์ M-L, สีเข้ม"
                            rows={3}
                            className="w-full border-0 border-b border-slate-300 px-0 py-2 focus:border-indigo-500 focus:ring-0 text-slate-900 placeholder-slate-400 resize-none"
                        />
                    </div>

                    {/* Summary */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                        <h3 className="text-sm font-semibold text-slate-700">สรุป</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="text-slate-500">ประเภท</span>
                            <span className="text-slate-900 font-medium">{type === 'EVENT' ? 'Event' : 'Branch'}</span>
                            <span className="text-slate-500">ชื่อ</span>
                            <span className="text-slate-900 font-medium">{name}</span>
                            <span className="text-slate-500">สถานที่</span>
                            <span className="text-slate-900 font-medium">{location}</span>
                            {type === 'EVENT' && startDate && (
                                <>
                                    <span className="text-slate-500">วันที่</span>
                                    <span className="text-slate-900 font-medium">{startDate} — {endDate}</span>
                                </>
                            )}
                            <span className="text-slate-500">พนักงาน</span>
                            <span className="text-slate-900 font-medium">{selectedStaff.length} คน</span>
                            <span className="text-slate-500">จำนวนสินค้า</span>
                            <span className="text-slate-900 font-medium">{initialQuantity || '0'} ชิ้น</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
                {step > 1 ? (
                    <button type="button" onClick={() => setStep(s => s - 1)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
                        ← ย้อนกลับ
                    </button>
                ) : <div />}

                {step < totalSteps ? (
                    <button
                        type="button"
                        onClick={() => setStep(s => s + 1)}
                        disabled={!canProceed()}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                        ถัดไป <ChevronRight className="h-4 w-4" />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
                    >
                        {isSubmitting ? 'กำลังสร้าง...' : 'สร้าง Sales Channel'}
                    </button>
                )}
            </div>
        </div>
    );
}
