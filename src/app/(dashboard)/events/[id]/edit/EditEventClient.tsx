"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
    Save, Send, Trash2, Star, Users, Package, Wrench,
    Calendar, ChevronDown, Search, Plus, Minus, Filter, ArrowLeft, Loader2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    updateEventWithDetails,
    type StaffSelection,
    type ProductRequestItem
} from "@/actions/event-actions";

type Staff = { id: string; name: string; phone: string | null };
type Product = {
    barcode: string;
    name: string;
    size: string | null;
    price: any;
    category: string | null;
    code?: string | null;
    color?: string | null;
};

type EventData = {
    id: string;
    name: string;
    location: string;
    code: string;
    status: string;
    startDate: string;
    endDate: string;
    staff: { staffId: string; role: string }[];
    products: { barcode: string; quantity: number; productName: string; size: string | null }[];
    equipment: { barcode: string; quantity: number; productName: string }[];
};

export default function EditEventClient({ eventId }: { eventId: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    // Form state
    const [eventCode, setEventCode] = useState("");
    const [name, setName] = useState("");
    const [location, setLocation] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Staff state
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [selectedStaff, setSelectedStaff] = useState<StaffSelection[]>([]);
    const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
    const [staffSearch, setStaffSearch] = useState("");

    // Products state
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<(ProductRequestItem & { name: string; size: string | null; code?: string | null; color?: string | null })[]>([]);
    const [productSearch, setProductSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("ทั้งหมด");

    // Equipment state
    const [equipment, setEquipment] = useState<Product[]>([]);
    const [selectedEquipment, setSelectedEquipment] = useState<(ProductRequestItem & { name: string })[]>([]);
    const [equipmentSearch, setEquipmentSearch] = useState("");

    // Section collapse state
    const [openSections, setOpenSections] = useState({
        basic: true,
        staff: true,
        products: true,
        equipment: true
    });

    // Load existing event data and reference data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch reference data
                const [staffRes, productsRes, equipmentRes, eventRes] = await Promise.all([
                    fetch('/api/staff'),
                    fetch('/api/products'),
                    fetch('/api/equipment'),
                    fetch(`/api/events/${eventId}`)
                ]);

                const staffData = await staffRes.json();
                const productData = await productsRes.json();
                const equipmentData = await equipmentRes.json();
                const eventData: EventData = await eventRes.json();

                setStaffList(staffData);
                setProducts(productData);
                setEquipment(equipmentData);

                // Pre-populate form with event data
                setEventCode(eventData.code);
                setName(eventData.name);
                setLocation(eventData.location);
                setStartDate(eventData.startDate.split('T')[0]);
                setEndDate(eventData.endDate.split('T')[0]);

                // Set staff
                setSelectedStaff(eventData.staff.map(s => ({
                    staffId: s.staffId,
                    isMain: s.role === 'Head'
                })));

                // Set products
                const productMap = new Map(productData.map((p: Product) => [p.barcode, p]));
                setSelectedProducts(eventData.products.map(p => ({
                    barcode: p.barcode,
                    quantity: p.quantity,
                    name: p.productName,
                    size: p.size,
                    code: productMap.get(p.barcode)?.code,
                    color: productMap.get(p.barcode)?.color
                })));

                // Set equipment
                setSelectedEquipment(eventData.equipment.map(e => ({
                    barcode: e.barcode,
                    quantity: e.quantity,
                    name: e.productName
                })));

                setIsLoading(false);
            } catch (error) {
                console.error("Failed to fetch data:", error);
                setError("ไม่สามารถโหลดข้อมูลได้");
                setIsLoading(false);
            }
        };
        fetchData();
    }, [eventId]);

    // Derived state for categories
    const categories = ["ทั้งหมด", ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

    // Staff handlers
    const addStaff = (staff: Staff) => {
        if (selectedStaff.find(s => s.staffId === staff.id)) return;
        setSelectedStaff([...selectedStaff, {
            staffId: staff.id,
            isMain: selectedStaff.length === 0
        }]);
        setStaffDropdownOpen(false);
        setStaffSearch("");
    };

    const removeStaff = (staffId: string) => {
        const newList = selectedStaff.filter(s => s.staffId !== staffId);
        if (newList.length > 0 && !newList.some(s => s.isMain)) {
            newList[0].isMain = true;
        }
        setSelectedStaff(newList);
    };

    const setMainStaff = (staffId: string) => {
        setSelectedStaff(selectedStaff.map(s => ({
            ...s,
            isMain: s.staffId === staffId
        })));
    };

    // Product handlers
    const addProduct = (product: Product) => {
        if (selectedProducts.find(p => p.barcode === product.barcode)) return;
        setSelectedProducts([...selectedProducts, {
            barcode: product.barcode,
            quantity: 10,
            name: product.name,
            size: product.size,
            code: product.code,
            color: product.color
        }]);
    };

    const updateProductQty = (barcode: string, qty: number) => {
        setSelectedProducts(selectedProducts.map(p =>
            p.barcode === barcode ? { ...p, quantity: Math.max(1, qty) } : p
        ));
    };

    const removeProduct = (barcode: string) => {
        setSelectedProducts(selectedProducts.filter(p => p.barcode !== barcode));
    };

    // Equipment handlers
    const toggleEquipment = (item: Product) => {
        const exists = selectedEquipment.find(e => e.barcode === item.barcode);
        if (exists) {
            setSelectedEquipment(selectedEquipment.filter(e => e.barcode !== item.barcode));
        } else {
            setSelectedEquipment([...selectedEquipment, {
                barcode: item.barcode,
                quantity: 1,
                name: item.name
            }]);
        }
    };

    const updateEquipmentQty = (barcode: string, qty: number) => {
        setSelectedEquipment(selectedEquipment.map(e =>
            e.barcode === barcode ? { ...e, quantity: Math.max(1, qty) } : e
        ));
    };

    // Filtering logic
    const filteredStaff = staffList.filter(s =>
        s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
        (s.phone && s.phone.includes(staffSearch))
    );

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            (p.size && p.size.toLowerCase().includes(productSearch.toLowerCase())) ||
            (p.code && p.code.toLowerCase().includes(productSearch.toLowerCase()));
        const matchesCategory = selectedCategory === "ทั้งหมด" || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const filteredEquipment = equipment.filter(e =>
        e.name.toLowerCase().includes(equipmentSearch.toLowerCase())
    );

    // Helpers
    const getStaffName = (staffId: string) => staffList.find(s => s.id === staffId)?.name || '';

    const formatProductName = (p: Product) => {
        const parts = [p.name];
        if (p.code) parts.push(p.code);
        if (p.color) parts.push(p.color);
        if (p.size) parts.push(p.size);
        return parts.join(" - ");
    };

    const toggleSection = (section: keyof typeof openSections) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Submit handler
    const handleSubmit = (submitType: 'draft' | 'submit') => {
        setError("");
        startTransition(async () => {
            const formData = new FormData();
            formData.set("name", name);
            formData.set("location", location);
            formData.set("startDate", startDate);
            formData.set("endDate", endDate);
            formData.set("submitType", submitType);
            formData.set("staff", JSON.stringify(selectedStaff));
            formData.set("products", JSON.stringify(selectedProducts.map(p => ({ barcode: p.barcode, quantity: p.quantity }))));
            formData.set("equipment", JSON.stringify(selectedEquipment.map(e => ({ barcode: e.barcode, quantity: e.quantity }))));

            try {
                await updateEventWithDetails(eventId, formData);
                router.push(`/events/${eventId}`);
            } catch (err: any) {
                setError(err.message);
            }
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-4 pb-24">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm py-4 -mx-4 px-4 md:-mx-0 md:px-0">
                <div className="flex items-center gap-3 mb-2">
                    <Link
                        href={`/events/${eventId}`}
                        className="flex items-center justify-center h-8 w-8 rounded-full bg-white shadow-sm hover:bg-slate-50"
                    >
                        <ArrowLeft className="h-4 w-4 text-slate-600" />
                    </Link>
                    <h2 className="text-xl font-bold text-slate-900">แก้ไข Event</h2>
                </div>
                <p className="text-sm text-slate-500 font-mono">{eventCode}</p>
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
                    {error}
                </div>
            )}

            {/* Section 1: Basic Info */}
            <section className="rounded-xl bg-white shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)]">
                <button
                    type="button"
                    onClick={() => toggleSection('basic')}
                    className="w-full flex items-center justify-between p-4 text-left"
                >
                    <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-indigo-600" />
                        <span className="font-semibold text-slate-700">ข้อมูลทั่วไป</span>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openSections.basic ? 'rotate-180' : ''}`} />
                </button>

                {openSections.basic && (
                    <div className="p-4 pt-0 space-y-4 border-t border-slate-100 mt-2">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อ Event</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                placeholder="เช่น งาน Big C พระราม 2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">สถานที่</label>
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                placeholder="เช่น Big C พระราม 2"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">วันเริ่ม</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">วันสิ้นสุด</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Section 2: Staff Selection */}
            <section className="rounded-xl bg-white shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)]">
                <button
                    type="button"
                    onClick={() => toggleSection('staff')}
                    className="w-full flex items-center justify-between p-4 text-left"
                >
                    <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-amber-600" />
                        <span className="font-semibold text-slate-700">
                            พนักงาน PC
                            {selectedStaff.length > 0 && (
                                <span className="ml-2 text-xs font-normal text-slate-500">
                                    ({selectedStaff.length} คน)
                                </span>
                            )}
                        </span>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openSections.staff ? 'rotate-180' : ''}`} />
                </button>

                {openSections.staff && (
                    <div className="p-4 pt-0 border-t border-slate-100 mt-2">
                        {/* Staff search/add */}
                        <div className="relative mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={staffSearch}
                                    onChange={(e) => {
                                        setStaffSearch(e.target.value);
                                        setStaffDropdownOpen(true);
                                    }}
                                    onFocus={() => setStaffDropdownOpen(true)}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    placeholder="ค้นหาชื่อหรือเบอร์โทร..."
                                />
                            </div>

                            {staffDropdownOpen && (
                                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {filteredStaff.length > 0 ? (
                                        filteredStaff.map(staff => (
                                            <button
                                                key={staff.id}
                                                type="button"
                                                onClick={() => addStaff(staff)}
                                                disabled={selectedStaff.some(s => s.staffId === staff.id)}
                                                className="w-full px-4 py-3 text-left hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                                            >
                                                <div>
                                                    <p className="font-medium text-slate-900">{staff.name}</p>
                                                    <p className="text-xs text-slate-500">{staff.phone || '-'}</p>
                                                </div>
                                                {selectedStaff.some(s => s.staffId === staff.id) && (
                                                    <span className="text-xs text-indigo-600">เลือกแล้ว</span>
                                                )}
                                            </button>
                                        ))
                                    ) : (
                                        <p className="px-4 py-3 text-slate-500 text-sm">ไม่พบพนักงาน</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Selected staff list */}
                        {selectedStaff.length > 0 ? (
                            <ul className="space-y-2">
                                {selectedStaff.map(s => (
                                    <li key={s.staffId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setMainStaff(s.staffId)}
                                                className={`p-1.5 rounded-full transition-colors ${s.isMain ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-400 hover:bg-amber-50'}`}
                                            >
                                                <Star className="h-4 w-4" fill={s.isMain ? "currentColor" : "none"} />
                                            </button>
                                            <div>
                                                <p className="font-medium text-slate-700">{getStaffName(s.staffId)}</p>
                                                <p className="text-xs text-slate-500">{s.isMain ? 'หัวหน้าทีม' : 'PC'}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeStaff(s.staffId)}
                                            className="p-2 text-slate-400 hover:text-red-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-slate-400 py-4 text-sm">ยังไม่ได้เลือกพนักงาน</p>
                        )}
                    </div>
                )}
            </section>

            {/* Section 3: Products */}
            <section className="rounded-xl bg-white shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)]">
                <button
                    type="button"
                    onClick={() => toggleSection('products')}
                    className="w-full flex items-center justify-between p-4 text-left"
                >
                    <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-rose-600" />
                        <span className="font-semibold text-slate-700">
                            สินค้าที่เบิก
                            {selectedProducts.length > 0 && (
                                <span className="ml-2 text-xs font-normal text-slate-500">
                                    ({selectedProducts.length} รายการ)
                                </span>
                            )}
                        </span>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openSections.products ? 'rotate-180' : ''}`} />
                </button>

                {openSections.products && (
                    <div className="p-4 pt-0 border-t border-slate-100 mt-2 space-y-4">
                        {/* Category filter */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2">
                            <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat as string)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Product search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                placeholder="ค้นหาสินค้า..."
                            />
                        </div>

                        {/* Product grid */}
                        <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                            {filteredProducts.slice(0, 20).map(product => {
                                const isSelected = selectedProducts.some(p => p.barcode === product.barcode);
                                return (
                                    <button
                                        key={product.barcode}
                                        type="button"
                                        onClick={() => addProduct(product)}
                                        disabled={isSelected}
                                        className={`p-3 rounded-lg text-left transition-all ${isSelected ? 'bg-indigo-100 border-2 border-indigo-300' : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'}`}
                                    >
                                        <p className="font-medium text-sm text-slate-700 truncate">{product.name}</p>
                                        <p className="text-xs text-slate-500 truncate">{product.code} • {product.size}</p>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Selected products list - at bottom like Create page */}
                        {selectedProducts.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center justify-between">
                                    <span>ที่เลือก ({selectedProducts.length})</span>
                                    <span className="text-xs font-normal text-slate-500">รวม {selectedProducts.reduce((sum, p) => sum + p.quantity, 0)} ชิ้น</span>
                                </h4>
                                <div className="space-y-2">
                                    {selectedProducts.map(p => (
                                        <div key={p.barcode} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded border border-slate-100">
                                            <span className="text-slate-700 truncate mr-2 flex-1">
                                                {p.name} - {p.code} - {p.size}
                                            </span>
                                            <div className="flex items-center gap-1 flex-none">
                                                <button type="button" onClick={() => updateProductQty(p.barcode, Math.max(1, p.quantity - 1))} className="p-1 text-slate-500 hover:bg-white rounded">
                                                    <Minus className="h-3 w-3" />
                                                </button>
                                                <input
                                                    type="number"
                                                    value={p.quantity}
                                                    onChange={(e) => updateProductQty(p.barcode, Math.max(1, parseInt(e.target.value) || 1))}
                                                    className="w-14 text-center font-semibold text-indigo-600 bg-white border border-slate-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                    min="1"
                                                />
                                                <button type="button" onClick={() => updateProductQty(p.barcode, p.quantity + 1)} className="p-1 text-slate-500 hover:bg-white rounded">
                                                    <Plus className="h-3 w-3" />
                                                </button>
                                                <button type="button" onClick={() => removeProduct(p.barcode)} className="text-slate-400 hover:text-red-500 ml-1">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* Section 4: Equipment */}
            <section className="rounded-xl bg-white shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)]">
                <button
                    type="button"
                    onClick={() => toggleSection('equipment')}
                    className="w-full flex items-center justify-between p-4 text-left"
                >
                    <div className="flex items-center gap-3">
                        <Wrench className="h-5 w-5 text-emerald-600" />
                        <span className="font-semibold text-slate-700">
                            อุปกรณ์
                            {selectedEquipment.length > 0 && (
                                <span className="ml-2 text-xs font-normal text-slate-500">
                                    ({selectedEquipment.length} รายการ)
                                </span>
                            )}
                        </span>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openSections.equipment ? 'rotate-180' : ''}`} />
                </button>

                {openSections.equipment && (
                    <div className="p-4 pt-0 border-t border-slate-100 mt-2 space-y-4">
                        {/* Equipment search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={equipmentSearch}
                                onChange={(e) => setEquipmentSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                placeholder="ค้นหาอุปกรณ์..."
                            />
                        </div>

                        {/* Equipment grid */}
                        <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                            {filteredEquipment.map(item => {
                                const selected = selectedEquipment.find(e => e.barcode === item.barcode);
                                return (
                                    <div
                                        key={item.barcode}
                                        className={`p-3 rounded-lg transition-all ${selected ? 'bg-emerald-100 border-2 border-emerald-300' : 'bg-slate-50 border border-slate-200'}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleEquipment(item)}
                                            className="w-full text-left"
                                        >
                                            <p className="font-medium text-sm text-slate-700">{item.name}</p>
                                        </button>
                                        {selected && (
                                            <div className="flex items-center gap-2 mt-2">
                                                <button type="button" onClick={() => updateEquipmentQty(item.barcode, selected.quantity - 1)} className="p-1 text-slate-500 hover:bg-white rounded">
                                                    <Minus className="h-3 w-3" />
                                                </button>
                                                <span className="text-sm font-medium">{selected.quantity}</span>
                                                <button type="button" onClick={() => updateEquipmentQty(item.barcode, selected.quantity + 1)} className="p-1 text-slate-500 hover:bg-white rounded">
                                                    <Plus className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Selected equipment list - at bottom like Create page */}
                        {selectedEquipment.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center justify-between">
                                    <span>ที่เลือก ({selectedEquipment.length})</span>
                                    <span className="text-xs font-normal text-slate-500">รวม {selectedEquipment.reduce((sum, e) => sum + e.quantity, 0)} ชิ้น</span>
                                </h4>
                                <div className="space-y-2">
                                    {selectedEquipment.map(e => (
                                        <div key={e.barcode} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded border border-slate-100">
                                            <span className="text-slate-700 truncate mr-2 flex-1">
                                                {e.name}
                                            </span>
                                            <div className="flex items-center gap-1 flex-none">
                                                <button type="button" onClick={() => updateEquipmentQty(e.barcode, Math.max(1, e.quantity - 1))} className="p-1 text-slate-500 hover:bg-white rounded">
                                                    <Minus className="h-3 w-3" />
                                                </button>
                                                <input
                                                    type="number"
                                                    value={e.quantity}
                                                    onChange={(ev) => updateEquipmentQty(e.barcode, Math.max(1, parseInt(ev.target.value) || 1))}
                                                    className="w-14 text-center font-semibold text-emerald-600 bg-white border border-slate-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                    min="1"
                                                />
                                                <button type="button" onClick={() => updateEquipmentQty(e.barcode, e.quantity + 1)} className="p-1 text-slate-500 hover:bg-white rounded">
                                                    <Plus className="h-3 w-3" />
                                                </button>
                                                <button type="button" onClick={() => setSelectedEquipment(selectedEquipment.filter(eq => eq.barcode !== e.barcode))} className="text-slate-400 hover:text-red-500 ml-1">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t border-slate-200 p-4 shadow-lg z-40">
                <div className="max-w-2xl mx-auto flex gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSubmit('draft')}
                        disabled={isPending || !name || !location || !startDate || !endDate}
                        className="flex-1"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        บันทึกแบบร่าง
                    </Button>
                    <Button
                        type="button"
                        onClick={() => handleSubmit('submit')}
                        disabled={isPending || !name || !location || !startDate || !endDate}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Send className="mr-2 h-4 w-4" />
                        ส่งอนุมัติ
                    </Button>
                </div>
            </div>
        </div>
    );
}
