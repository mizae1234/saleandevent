"use client";

import { useState, useMemo } from "react";
import { Search, Package, MapPin, Store, ArrowRight, History, Minus, Plus, Save, X, ChevronDown, ChevronUp, Undo2, AlertTriangle, Calendar } from "lucide-react";
import { PageHeader, Spinner, EmptyState, ConfirmDialog } from "@/components/shared";
import { useToast } from "@/components/ui/toast";
import {
    getChannelStockForAdjustment,
    adjustChannelStock,
    getAdjustmentHistory,
    type AdjustmentItem,
} from "@/actions/stock-request/adjustment";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface Channel {
    id: string;
    code: string;
    name: string;
    type: string;
    status: string;
    location: string;
    startDate: string | null;
    endDate: string | null;
    stockCount: number;
}

interface StockItem {
    id: string;
    barcode: string;
    quantity: number;
    soldQuantity: number;
    remaining: number;
    product: {
        code: string | null;
        name: string;
        size: string | null;
        color: string | null;
        producttype: string | null;
    };
}

interface AdjustmentEntry {
    barcode: string;
    productName: string;
    code: string;
    color: string;
    size: string;
    currentQty: number;
    newQty: number;
    reason: string;
}

interface HistoryItem {
    id: string;
    barcode: string;
    quantity: number;
    fromLocation: string | null;
    toLocation: string | null;
    notes: string | null;
    createdAt: string;
    product: { name: string; code: string | null; color: string | null; size: string | null };
}

interface Props {
    channels: Channel[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: "ร่าง", color: "bg-slate-100 text-slate-600" },
    active: { label: "เปิดใช้งาน", color: "bg-emerald-100 text-emerald-700" },
    closed: { label: "ปิดแล้ว", color: "bg-red-100 text-red-600" },
    closing: { label: "กำลังปิดยอด", color: "bg-amber-100 text-amber-700" },
};

export function StockAdjustmentClient({ channels }: Props) {
    const [search, setSearch] = useState("");
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [stock, setStock] = useState<StockItem[]>([]);
    const [adjustments, setAdjustments] = useState<Map<string, AdjustmentEntry>>(new Map());
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [stockSearch, setStockSearch] = useState("");
    const { toastSuccess, toastError, toastWarning } = useToast();



    // Filter channels
    const filteredChannels = useMemo(() => {
        if (!search) return channels;
        const q = search.toLowerCase();
        return channels.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q) ||
            c.location.toLowerCase().includes(q)
        );
    }, [channels, search]);

    // Filter stock items
    const filteredStock = useMemo(() => {
        if (!stockSearch) return stock;
        const q = stockSearch.toLowerCase();
        return stock.filter(s =>
            s.product.name.toLowerCase().includes(q) ||
            (s.product.code || "").toLowerCase().includes(q) ||
            (s.product.color || "").toLowerCase().includes(q) ||
            s.barcode.toLowerCase().includes(q)
        );
    }, [stock, stockSearch]);

    // Select channel & load stock
    const handleSelectChannel = async (channel: Channel) => {
        setSelectedChannel(channel);
        setAdjustments(new Map());
        setShowHistory(false);
        setStockSearch("");
        setLoading(true);
        try {
            const [stockData, historyData] = await Promise.all([
                getChannelStockForAdjustment(channel.id),
                getAdjustmentHistory(channel.id),
            ]);
            setStock(stockData);
            setHistory(historyData);
        } catch {
            toastError("โหลดข้อมูล stock ไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    };

    // Update adjustment
    const updateAdjustment = (item: StockItem, newQty: number, reason?: string) => {
        const map = new Map(adjustments);
        const existing = map.get(item.barcode);

        if (newQty === item.quantity && !reason) {
            // Remove if back to original
            map.delete(item.barcode);
        } else {
            map.set(item.barcode, {
                barcode: item.barcode,
                productName: item.product.name,
                code: item.product.code || item.barcode,
                color: item.product.color || "-",
                size: item.product.size || "-",
                currentQty: item.quantity,
                newQty: newQty,
                reason: reason || existing?.reason || "",
            });
        }
        setAdjustments(map);
    };

    // Update reason for an adjustment
    const updateReason = (barcode: string, reason: string) => {
        const map = new Map(adjustments);
        const entry = map.get(barcode);
        if (entry) {
            map.set(barcode, { ...entry, reason });
            setAdjustments(map);
        }
    };

    // Save adjustments (called from ConfirmDialog onConfirm)
    const handleConfirmSave = async () => {
        if (!selectedChannel) return;
        setSaving(true);

        try {
            const items: AdjustmentItem[] = Array.from(adjustments.values()).map(a => ({
                barcode: a.barcode,
                currentQty: a.currentQty,
                newQty: a.newQty,
                reason: a.reason,
            }));

            const result = await adjustChannelStock(selectedChannel.id, items);
            if ('error' in result) {
                toastError(result.error as string);
            } else {
                toastSuccess(`ปรับปรุง Stock สำเร็จ ${result.totalChanged} รายการ`);
                setAdjustments(new Map());
                await handleSelectChannel(selectedChannel);
            }
        } catch (e: unknown) {
            toastError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
        } finally {
            setSaving(false);
        }
    };

    // Check if all adjustments have reasons (for enabling save)
    const allHaveReasons = Array.from(adjustments.values()).every(a => a.reason.trim());

    // Get current quantity (adjusted or original)
    const getCurrentQty = (item: StockItem) => {
        const adj = adjustments.get(item.barcode);
        return adj ? adj.newQty : item.quantity;
    };

    // Calculate totals of changed items
    const totalOriginalQty = useMemo(() => {
        return Array.from(adjustments.values()).reduce((sum, a) => sum + a.currentQty, 0);
    }, [adjustments]);

    const totalNewQty = useMemo(() => {
        return Array.from(adjustments.values()).reduce((sum, a) => sum + a.newQty, 0);
    }, [adjustments]);

    const totalDiff = totalNewQty - totalOriginalQty;

    // Calculate totals for all stock in table
    const totalSentQty = useMemo(() => {
        return filteredStock.reduce((sum, item) => sum + item.quantity, 0);
    }, [filteredStock]);

    const totalSoldQty = useMemo(() => {
        return filteredStock.reduce((sum, item) => sum + item.soldQuantity, 0);
    }, [filteredStock]);

    const totalCurrentAdjustedQty = useMemo(() => {
        return filteredStock.reduce((sum, item) => sum + getCurrentQty(item), 0);
    }, [filteredStock, adjustments]);

    const changedCount = adjustments.size;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            <PageHeader
                title="ปรับปรุง Stock"
                subtitle="แก้ไขจำนวนสินค้าในช่องทางขายโดยตรง พร้อมบันทึกประวัติการเปลี่ยนแปลง"
            />

            {/* Channel Selector / Stock Editor */}
            {!selectedChannel ? (
                // ─── Channel List ───
                <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="ค้นหาช่องทาง (ชื่อ, รหัส, สถานที่)..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
                        />
                    </div>

                    {/* Channel Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredChannels.map(ch => {
                            const st = statusConfig[ch.status] || { label: ch.status, color: "bg-slate-100 text-slate-600" };
                            return (
                                <button
                                    key={ch.id}
                                    onClick={() => handleSelectChannel(ch)}
                                    className="text-left p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-300 hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Store className="h-4 w-4 text-teal-600" />
                                            <span className="text-xs font-mono text-slate-400">{ch.code}</span>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                                            {st.label}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-slate-800 text-sm mb-1 group-hover:text-teal-700 transition-colors">
                                        {ch.name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <MapPin className="h-3 w-3" />
                                        {ch.location}
                                    </div>
                                    {ch.type === "EVENT" && ch.startDate && (
                                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(ch.startDate), "d MMM yy", { locale: th })}
                                            {ch.endDate && ` - ${format(new Date(ch.endDate), "d MMM yy", { locale: th })}`}
                                        </div>
                                    )}
                                    <div className="mt-3 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Package className="h-3.5 w-3.5" />
                                            {ch.stockCount} รายการ
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    {filteredChannels.length === 0 && (
                        <EmptyState icon={Store} message="ไม่พบช่องทางที่ตรงกับการค้นหา" />
                    )}
                </div>
            ) : (
                // ─── Stock Editor ───
                <div className="space-y-4">
                    {/* Back + Channel Info */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => { setSelectedChannel(null); setStock([]); setAdjustments(new Map()); }}
                            className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 transition-colors"
                        >
                            <Undo2 className="h-4 w-4" />
                            กลับเลือกช่องทาง
                        </button>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                    showHistory
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                            >
                                <History className="h-3.5 w-3.5" />
                                ประวัติปรับปรุง
                                {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                        </div>
                    </div>

                    {/* Channel Info Card */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                                <Store className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-800">{selectedChannel.name}</h2>
                                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                    <span>{selectedChannel.code}</span>
                                    <span>·</span>
                                    <MapPin className="h-3 w-3" />
                                    <span>{selectedChannel.location}</span>
                                    {selectedChannel.type === "EVENT" && selectedChannel.startDate && (
                                        <>
                                            <span>·</span>
                                            <Calendar className="h-3 w-3" />
                                            <span>
                                                {format(new Date(selectedChannel.startDate), "d MMM yy", { locale: th })}
                                                {selectedChannel.endDate && ` - ${format(new Date(selectedChannel.endDate), "d MMM yy", { locale: th })}`}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="ml-auto text-right">
                                <p className="text-2xl font-bold text-teal-700">{stock.length}</p>
                                <p className="text-xs text-slate-400">รายการสินค้า</p>
                            </div>
                        </div>
                    </div>

                    {/* History Panel */}
                    {showHistory && (
                        <div className="bg-amber-50/50 rounded-xl border border-amber-200 overflow-hidden">
                            <div className="px-4 py-3 bg-amber-100/50 border-b border-amber-200">
                                <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                                    <History className="h-4 w-4" />
                                    ประวัติการปรับปรุง Stock (ล่าสุด 50 รายการ)
                                </h3>
                            </div>
                            {history.length === 0 ? (
                                <div className="p-6 text-center text-sm text-amber-600">ยังไม่มีประวัติการปรับปรุง</div>
                            ) : (
                                <div className="divide-y divide-amber-100 max-h-64 overflow-y-auto">
                                    {history.map(h => {
                                        const isIn = h.toLocation && h.toLocation !== 'ADJUSTMENT_OUT';
                                        return (
                                            <div key={h.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                                                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                                    isIn ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                                                }`}>
                                                    {isIn ? "+" : "-"}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-slate-700 truncate">
                                                        <span className="font-medium">{h.product.code || h.barcode}</span>
                                                        {h.product.color && <span className="text-slate-400"> · {h.product.color}</span>}
                                                        {h.product.size && <span className="text-slate-400"> · {h.product.size}</span>}
                                                    </p>
                                                    <p className="text-xs text-slate-400 truncate">{h.notes}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className={`font-semibold ${isIn ? "text-emerald-700" : "text-red-600"}`}>
                                                        {isIn ? "+" : "-"}{h.quantity}
                                                    </p>
                                                    <p className="text-xs text-slate-400">
                                                        {format(new Date(h.createdAt), "d MMM yy HH:mm", { locale: th })}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Search + Save Bar */}
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={stockSearch}
                                onChange={e => setStockSearch(e.target.value)}
                                placeholder="ค้นหาสินค้า (ชื่อ, รหัส, สี, barcode)..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
                            />
                        </div>
                        {changedCount > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setAdjustments(new Map())}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    ยกเลิก
                                </button>
                                <ConfirmDialog
                                    trigger={
                                        <button
                                            disabled={saving || !allHaveReasons}
                                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                                        >
                                            {saving ? <Spinner size="sm" /> : <Save className="h-3.5 w-3.5" />}
                                            บันทึก ({changedCount})
                                        </button>
                                    }
                                    title="ยืนยันการปรับปรุง Stock"
                                    message={`คุณกำลังจะปรับปรุง ${changedCount} รายการ ใน "${selectedChannel?.name}" การเปลี่ยนแปลงจะถูกบันทึกประวัติไว้`}
                                    onConfirm={handleConfirmSave}
                                    confirmText="ยืนยันปรับปรุง"
                                    variant="warning"
                                    disabled={!allHaveReasons}
                                />
                            </div>
                        )}
                    </div>

                    {/* Changed Items Summary */}
                    {changedCount > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <span className="text-sm font-semibold text-amber-800">
                                    รายการที่เปลี่ยนแปลง ({changedCount} รายการ)
                                </span>
                            </div>
                            <div className="space-y-1.5 mb-3">
                                {Array.from(adjustments.values()).map(adj => {
                                    const diff = adj.newQty - adj.currentQty;
                                    return (
                                        <div key={adj.barcode} className="flex items-center gap-2 text-xs">
                                            <span className="font-mono text-slate-500 w-16 shrink-0">{adj.code}</span>
                                            <span className="text-slate-500 truncate max-w-[150px]">{adj.productName} ({adj.color} {adj.size})</span>
                                            <span className="text-slate-400 mx-1">:</span>
                                            <span className="text-slate-500 font-mono">{adj.currentQty}</span>
                                            <span className="text-slate-400">→</span>
                                            <span className={`font-bold font-mono ${diff > 0 ? "text-emerald-700" : "text-red-600"}`}>
                                                {adj.newQty} ({diff > 0 ? "+" : ""}{diff})
                                            </span>
                                            <span className="text-slate-300 mx-1">|</span>
                                            <input
                                                type="text"
                                                value={adj.reason}
                                                onChange={e => updateReason(adj.barcode, e.target.value)}
                                                placeholder="ระบุเหตุผล..."
                                                className={`flex-1 px-2 py-0.5 rounded border text-xs ${
                                                    !adj.reason.trim()
                                                        ? "border-red-300 bg-red-50"
                                                        : "border-slate-200 bg-white"
                                                } focus:outline-none focus:ring-1 focus:ring-teal-400`}
                                            />
                                            <button
                                                onClick={() => {
                                                    const map = new Map(adjustments);
                                                    map.delete(adj.barcode);
                                                    setAdjustments(map);
                                                }}
                                                className="p-0.5 rounded hover:bg-amber-200 text-amber-500 transition-colors"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            {/* Total summary row */}
                            <div className="pt-2 border-t border-amber-200/60 flex flex-wrap items-center justify-between text-xs font-semibold text-amber-900 gap-2">
                                <span>ยอดรวมส่วนต่างปรับปรุง (Total):</span>
                                <div className="flex items-center gap-3">
                                    <span>เดิมรวม: <span className="font-mono font-bold">{totalOriginalQty}</span> ชิ้น</span>
                                    <span className="text-amber-300">|</span>
                                    <span>ใหม่รวม: <span className="font-mono font-bold text-teal-800">{totalNewQty}</span> ชิ้น</span>
                                    <span className="text-amber-300">|</span>
                                    <span>
                                        ส่วนต่างสุทธิ:{" "}
                                        <span className={`font-mono font-bold ${totalDiff > 0 ? "text-emerald-700" : totalDiff < 0 ? "text-red-600" : "text-slate-600"}`}>
                                            {totalDiff > 0 ? "+" : ""}{totalDiff} ชิ้น
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stock Table */}
                    {loading ? (
                        <div className="py-16 flex justify-center">
                            <Spinner size="lg" />
                        </div>
                    ) : stock.length === 0 ? (
                        <EmptyState icon={Package} message="ช่องทางนี้ยังไม่มี Stock" />
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="text-left p-3 text-xs font-semibold text-slate-500 w-10">#</th>
                                            <th className="text-left p-3 text-xs font-semibold text-slate-500">รหัส</th>
                                            <th className="text-left p-3 text-xs font-semibold text-slate-500">ชื่อสินค้า</th>
                                            <th className="text-center p-3 text-xs font-semibold text-slate-500">สี</th>
                                            <th className="text-center p-3 text-xs font-semibold text-slate-500">ไซส์</th>
                                            <th className="text-center p-3 text-xs font-semibold text-slate-500 w-20">รับเข้า</th>
                                            <th className="text-center p-3 text-xs font-semibold text-slate-500 w-20">ขายแล้ว</th>
                                            <th className="text-center p-3 text-xs font-semibold text-slate-500 w-32">ปรับจำนวน (รับเข้า)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredStock.map((item, idx) => {
                                            const adj = adjustments.get(item.barcode);
                                            const currentQty = getCurrentQty(item);
                                            const isChanged = adj !== undefined;
                                            const diff = isChanged ? adj.newQty - adj.currentQty : 0;

                                            return (
                                                <tr
                                                    key={item.id}
                                                    className={`hover:bg-slate-50 transition-colors ${
                                                        isChanged ? "bg-amber-50/50" : ""
                                                    }`}
                                                >
                                                    <td className="p-3 text-slate-400 text-xs">{idx + 1}</td>
                                                    <td className="p-3">
                                                        <span className="font-mono text-xs font-semibold text-teal-700">
                                                            {item.product.code || item.barcode}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-slate-700 text-xs">{item.product.name}</td>
                                                    <td className="p-3 text-center text-slate-500 text-xs">{item.product.color || "-"}</td>
                                                    <td className="p-3 text-center text-slate-500 text-xs">{item.product.size || "-"}</td>
                                                    <td className="p-3 text-center">
                                                        <span className={`font-semibold ${isChanged ? "text-amber-600 line-through" : "text-slate-700"}`}>
                                                            {item.quantity}
                                                        </span>
                                                        {isChanged && (
                                                            <span className={`ml-1.5 font-bold ${diff > 0 ? "text-emerald-700" : "text-red-600"}`}>
                                                                {adj.newQty}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center text-blue-600 font-medium">{item.soldQuantity}</td>
                                                    <td className="p-3">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                onClick={() => updateAdjustment(item, currentQty - 1)}
                                                                disabled={currentQty <= 0}
                                                                className="p-1 rounded-md bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                <Minus className="h-3.5 w-3.5" />
                                                            </button>
                                                            <input
                                                                type="number"
                                                                value={currentQty}
                                                                onChange={e => {
                                                                    const val = parseInt(e.target.value);
                                                                    if (!isNaN(val) && val >= 0) {
                                                                        updateAdjustment(item, val);
                                                                    }
                                                                }}
                                                                className={`w-16 text-center py-1 rounded-md border text-sm font-semibold ${
                                                                    isChanged
                                                                        ? "border-amber-300 bg-amber-50 text-amber-800"
                                                                        : "border-slate-200 bg-white text-slate-700"
                                                                } focus:outline-none focus:ring-1 focus:ring-teal-400`}
                                                            />
                                                            <button
                                                                onClick={() => updateAdjustment(item, currentQty + 1)}
                                                                className="p-1 rounded-md bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 transition-colors"
                                                            >
                                                                <Plus className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                        {isChanged && (
                                                            <div className="text-center mt-1">
                                                                <span className={`text-xs font-medium ${diff > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                                    {diff > 0 ? `+${diff}` : diff}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-800 text-xs">
                                        <tr>
                                            <td colSpan={5} className="p-3 text-center">รวมทั้งหมด (Total)</td>
                                            <td className="p-3 text-center">
                                                <span className={`${changedCount > 0 ? "text-slate-400 line-through font-normal" : "font-semibold"}`}>
                                                    {totalSentQty}
                                                </span>
                                                {changedCount > 0 && (
                                                    <span className="ml-1.5 font-bold text-teal-700">
                                                        {totalCurrentAdjustedQty}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center text-blue-600 font-mono">{totalSoldQty}</td>
                                            <td className="p-3 text-center">
                                                {changedCount > 0 && (
                                                    <span className={`font-semibold ${totalDiff > 0 ? "text-emerald-600" : totalDiff < 0 ? "text-red-500" : "text-slate-500"}`}>
                                                        ปรับปรุง: {totalDiff > 0 ? "+" : ""}{totalDiff} ชิ้น
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
