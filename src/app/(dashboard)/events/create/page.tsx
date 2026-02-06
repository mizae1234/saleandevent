"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
    Save, Send, Trash2, Star, Users, Package, Wrench,
    Calendar, ChevronDown, Search, Plus, Minus, Filter
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    createEventWithDetails,
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

export default function CreateEventPage() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Form state
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

    // Load data from API routes on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [staffRes, productsRes, equipmentRes] = await Promise.all([
                    fetch('/api/staff'),
                    fetch('/api/products'),
                    fetch('/api/equipment')
                ]);

                const staffData = await staffRes.json();
                const productData = await productsRes.json();
                const equipmentData = await equipmentRes.json();

                setStaffList(staffData);
                setProducts(productData);
                setEquipment(equipmentData);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            }
        };
        fetchData();
    }, []);

    // Derived state for categories
    const categories = ["ทั้งหมด", ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

    // Staff handlers
    const addStaff = (staff: Staff) => {
        if (selectedStaff.find(s => s.staffId === staff.id)) return;
        setSelectedStaff([...selectedStaff, {
            staffId: staff.id,
            isMain: selectedStaff.length === 0 // First one is main
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
                await createEventWithDetails(formData);
                router.push("/events");
            } catch (error) {
                console.error(error);
            }
        });
    };

    return (
        <div className="max-w-2xl mx-auto space-y-4 pb-24">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm py-4 -mx-4 px-4 md:-mx-0 md:px-0">
                <h2 className="text-xl font-bold text-slate-900">ขอเปิด Event ใหม่</h2>
                <p className="text-sm text-slate-500">รหัสจะ generate อัตโนมัติเมื่อบันทึก</p>
            </div>

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
                            <label className="text-sm font-semibold text-slate-700">ชื่อ Event</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Summer Sale @ Central"
                                required
                                className="mt-1 w-full h-11 rounded-lg border border-slate-200 bg-slate-50/30 px-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-slate-700">สถานที่</label>
                            <input
                                type="text"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                placeholder="Central World, Zone A"
                                required
                                className="mt-1 w-full h-11 rounded-lg border border-slate-200 bg-slate-50/30 px-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-semibold text-slate-700">วันเริ่ม</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    required
                                    className="mt-1 w-full h-11 rounded-lg border border-slate-200 bg-slate-50/30 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-700">วันสิ้นสุด</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    required
                                    className="mt-1 w-full h-11 rounded-lg border border-slate-200 bg-slate-50/30 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Section 2: Staff */}
            <section className="rounded-xl bg-white shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] relative z-20">
                <button
                    type="button"
                    onClick={() => toggleSection('staff')}
                    className="w-full flex items-center justify-between p-4 text-left"
                >
                    <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-indigo-600" />
                        <span className="font-semibold text-slate-700">พนักงานประจำอีเวนท์ (PC)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400">{selectedStaff.length} คน</span>
                        <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openSections.staff ? 'rotate-180' : ''}`} />
                    </div>
                </button>

                {openSections.staff && (
                    <div className="p-4 pt-0 space-y-3 border-t border-slate-100 mt-2">
                        {/* Staff Dropdown */}
                        <div className="relative">
                            <label className="text-sm font-semibold text-slate-700">เพิ่มพนักงาน</label>
                            <button
                                type="button"
                                onClick={() => setStaffDropdownOpen(!staffDropdownOpen)}
                                className="mt-1 w-full h-11 flex items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <span className={staffDropdownOpen ? 'text-indigo-600' : ''}>
                                    {staffDropdownOpen ? 'กำลังค้นหา...' : '-- เลือกพนักงาน --'}
                                </span>
                                <ChevronDown className="h-4 w-4" />
                            </button>

                            {staffDropdownOpen && (
                                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-80 flex flex-col ring-1 ring-black ring-opacity-5">
                                    <div className="p-2 border-b border-slate-100 bg-slate-50 rounded-t-lg sticky top-0 z-10">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <input
                                                type="text"
                                                value={staffSearch}
                                                onChange={e => setStaffSearch(e.target.value)}
                                                placeholder="ค้นหาชื่อ หรือ เบอร์โทร..."
                                                autoFocus
                                                className="w-full h-9 pl-9 rounded-md border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                                onClick={e => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto max-h-60">
                                        {filteredStaff.filter(s => !selectedStaff.find(sel => sel.staffId === s.id)).map(staff => (
                                            <button
                                                key={staff.id}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    addStaff(staff);
                                                }}
                                                className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 border-b border-slate-100 last:border-0 active:bg-slate-100 transition-colors"
                                            >
                                                <div className="font-medium text-slate-800">{staff.name}</div>
                                                {staff.phone && <div className="text-xs text-slate-500 mt-0.5">{staff.phone}</div>}
                                            </button>
                                        ))}
                                        {filteredStaff.length === 0 && (
                                            <div className="px-4 py-8 text-slate-400 text-sm text-center">ไม่พบพนักงานที่ค้นหา</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Selected Staff List */}
                        <div className="space-y-2 mt-2">
                            {selectedStaff.map(selected => (
                                <div
                                    key={selected.staffId}
                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${selected.isMain ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-white border-slate-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setMainStaff(selected.staffId)}
                                            className={`${selected.isMain ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'} p-1 -ml-1 transition-colors`}
                                            title="ตั้งเป็นผู้รับผิดชอบหลัก"
                                        >
                                            <Star className="h-5 w-5" fill={selected.isMain ? 'currentColor' : 'none'} />
                                        </button>
                                        <span className={`font-medium ${selected.isMain ? 'text-amber-900' : 'text-slate-700'}`}>
                                            {getStaffName(selected.staffId)}
                                        </span>
                                        {selected.isMain && (
                                            <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">MAIN</span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeStaff(selected.staffId)}
                                        className="text-slate-400 hover:text-red-500 p-2 -mr-2 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* Section 3: Products (Catalog Grid) */}
            <section className="rounded-xl bg-white shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] relative z-10">
                <button
                    type="button"
                    onClick={() => toggleSection('products')}
                    className="w-full flex items-center justify-between p-4 text-left"
                >
                    <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-indigo-600" />
                        <span className="font-semibold text-slate-700">รายการขอสินค้าเบื้องต้น</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400">{selectedProducts.length} รายการ</span>
                        <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openSections.products ? 'rotate-180' : ''}`} />
                    </div>
                </button>

                {openSections.products && (
                    <div className="p-4 pt-0 space-y-4 border-t border-slate-100 mt-2">
                        {/* Search & Filter */}
                        <div className="space-y-3 sticky top-14 md:static z-20 bg-white pt-2 pb-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={productSearch}
                                    onChange={e => setProductSearch(e.target.value)}
                                    placeholder="ค้นหาสินค้า (ชื่อ, รหัส, Size)..."
                                    className="w-full h-10 pl-9 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
                                />
                            </div>

                            {/* Category Pills */}
                            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar">
                                {categories.map(cat => (
                                    <button
                                        key={cat as string}
                                        type="button"
                                        onClick={() => setSelectedCategory(cat as string)}
                                        className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedCategory === cat
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Catalog Grid */}
                        <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                            {filteredProducts.map(product => {
                                const selected = selectedProducts.find(p => p.barcode === product.barcode);
                                const qty = selected?.quantity || 0;

                                return (
                                    <div
                                        key={product.barcode}
                                        onClick={() => !qty && addProduct(product)}
                                        className={`p-3 rounded-lg border flex flex-col justify-between transition-all duration-200 ${qty > 0
                                            ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200 shadow-sm'
                                            : 'bg-white border-slate-200 hover:border-indigo-300 active:scale-95 cursor-pointer hover:shadow-sm'
                                            }`}
                                    >
                                        <div>
                                            <div className="font-semibold text-slate-800 text-sm leading-tight line-clamp-2">
                                                {formatProductName(product)}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1.5 flex flex-wrap gap-2">
                                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{product.price.toLocaleString()} บ.</span>
                                            </div>
                                        </div>

                                        <div className="mt-3">
                                            {qty > 0 ? (
                                                <div className="flex items-center justify-between bg-white rounded-md shadow-sm border border-indigo-100 p-1" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        className="w-8 h-7 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded active:bg-indigo-100 transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (qty <= 10) removeProduct(product.barcode);
                                                            else updateProductQty(product.barcode, qty - 10);
                                                        }}
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </button>
                                                    <span className="font-bold text-indigo-700 text-sm w-8 text-center">{qty}</span>
                                                    <button
                                                        type="button"
                                                        className="w-8 h-7 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded active:bg-indigo-100 transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateProductQty(product.barcode, qty + 10);
                                                        }}
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-center text-xs font-semibold text-indigo-600 bg-indigo-50 py-1.5 rounded-md border border-indigo-100 hover:bg-indigo-100 transition-colors">
                                                    เลือก
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {filteredProducts.length === 0 && (
                            <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-slate-400 text-sm">ไม่พบสินค้าในหมวดหมู่นี้</p>
                            </div>
                        )}

                        {/* Selected Summary List */}
                        {selectedProducts.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center justify-between">
                                    <span>ที่เลือก ({selectedProducts.length})</span>
                                    <span className="text-xs font-normal text-slate-500">รวม {selectedProducts.reduce((sum, p) => sum + p.quantity, 0)} ชิ้น</span>
                                </h4>
                                <div className="space-y-2">
                                    {selectedProducts.map(p => (
                                        <div key={p.barcode} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded border border-slate-100">
                                            <span className="text-slate-700 truncate mr-2 flex-1 relative top-[-1px]">
                                                {formatProductName(p as Product)}
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

            {/* Section 4: Equipment (Catalog Grid) */}
            <section className="rounded-xl bg-white shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)]">
                <button
                    type="button"
                    onClick={() => toggleSection('equipment')}
                    className="w-full flex items-center justify-between p-4 text-left"
                >
                    <div className="flex items-center gap-3">
                        <Wrench className="h-5 w-5 text-indigo-600" />
                        <span className="font-semibold text-slate-700">รายการขออุปกรณ์เบื้องต้น</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400">{selectedEquipment.length} รายการ</span>
                        <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openSections.equipment ? 'rotate-180' : ''}`} />
                    </div>
                </button>

                {openSections.equipment && (
                    <div className="p-4 pt-0 space-y-4 border-t border-slate-100 mt-2">
                        {/* Equipment Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={equipmentSearch}
                                onChange={e => setEquipmentSearch(e.target.value)}
                                placeholder="ค้นหาอุปกรณ์..."
                                className="w-full h-10 pl-9 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                            {filteredEquipment.map(item => {
                                const selected = selectedEquipment.find(e => e.barcode === item.barcode);
                                const qty = selected?.quantity || 0;

                                return (
                                    <div
                                        key={item.barcode}
                                        onClick={() => !qty && toggleEquipment(item)}
                                        className={`p-3 rounded-lg border flex flex-col justify-between transition-all duration-200 ${qty > 0
                                            ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-200 shadow-sm'
                                            : 'bg-white border-slate-200 hover:border-amber-300 active:scale-95 cursor-pointer hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="font-semibold text-slate-800 text-sm leading-tight">{item.name}</div>

                                        <div className="mt-3">
                                            {qty > 0 ? (
                                                <div className="flex items-center justify-between bg-white rounded-md shadow-sm border border-amber-100 p-1" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        className="w-8 h-7 flex items-center justify-center text-amber-600 hover:bg-amber-50 rounded active:bg-amber-100 transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (qty <= 1) toggleEquipment(item);
                                                            else updateEquipmentQty(item.barcode, qty - 1);
                                                        }}
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </button>
                                                    <span className="font-bold text-amber-700 text-sm w-8 text-center">{qty}</span>
                                                    <button
                                                        type="button"
                                                        className="w-8 h-7 flex items-center justify-center text-amber-600 hover:bg-amber-50 rounded active:bg-amber-100 transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateEquipmentQty(item.barcode, qty + 1);
                                                        }}
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-center text-xs font-semibold text-amber-600 bg-amber-50 py-1.5 rounded-md border border-amber-100 hover:bg-amber-100 transition-colors">
                                                    เพิ่ม
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {filteredEquipment.length === 0 && (
                            <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 border border-slate-100 rounded-lg">ไม่พบอุปกรณ์</div>
                        )}

                        {/* Selected Equipment List Summary */}
                        {selectedEquipment.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center justify-between">
                                    <span>อุปกรณ์ที่เลือก ({selectedEquipment.length})</span>
                                    <span className="text-xs font-normal text-slate-500">รวม {selectedEquipment.reduce((sum, e) => sum + e.quantity, 0)} ชิ้น</span>
                                </h4>
                                <div className="space-y-2">
                                    {selectedEquipment.map(e => (
                                        <div key={e.barcode} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded border border-slate-100">
                                            <span className="text-slate-700 truncate mr-2 flex-1 relative top-[-1px]">
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
                                                    className="w-14 text-center font-semibold text-amber-600 bg-white border border-slate-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                    min="1"
                                                />
                                                <button type="button" onClick={() => updateEquipmentQty(e.barcode, e.quantity + 1)} className="p-1 text-slate-500 hover:bg-white rounded">
                                                    <Plus className="h-3 w-3" />
                                                </button>
                                                <button type="button" onClick={() => toggleEquipment({ barcode: e.barcode } as Product)} className="text-slate-400 hover:text-red-500 ml-1">
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

            {/* Fixed Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex gap-3 md:static md:border-0 md:bg-transparent md:p-0 md:pt-4 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:shadow-none safe-area-bottom">
                <Link href="/events" className="flex-1 md:flex-none">
                    <Button type="button" className="w-full bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 h-11 md:h-10 text-base md:text-sm font-medium">
                        ยกเลิก
                    </Button>
                </Link>
                <Button
                    type="button"
                    onClick={() => handleSubmit('draft')}
                    disabled={isPending || !name || !location || !startDate || !endDate}
                    className="flex-1 bg-slate-600 hover:bg-slate-700 text-white h-11 md:h-10 text-base md:text-sm font-medium"
                >
                    <Save className="mr-2 h-4 w-4" />
                    บันทึกร่าง
                </Button>
                <Button
                    type="button"
                    onClick={() => handleSubmit('submit')}
                    disabled={isPending || !name || !location || !startDate || !endDate}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-11 md:h-10 text-base md:text-sm font-medium shadow-lg md:shadow-none"
                >
                    <Send className="mr-2 h-4 w-4" />
                    ส่งอนุมัติ
                </Button>
            </div>
        </div>
    );
}
