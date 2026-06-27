"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
    Banknote,
    Calendar,
    Search,
    CheckCircle2,
    Circle,
    FileCheck,
    Clock,
    Download,
    CreditCard,
    Users
} from "lucide-react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/shared";

interface PayrollRow {
    channelStaffId: string;
    staffId: string;
    staffCode: string;
    name: string;
    role: string;
    isMain: boolean;
    bankName: string;
    bankAccountNo: string;
    phone: string;
    paymentType: string;
    isWagePaid: boolean;
    wagePaidAt: string | null;
    isCommissionPaid: boolean;
    commissionPaidAt: string | null;
    isSubmitted: boolean;
    submittedAt: string | null;
    daysWorked: number;
    dailyRate: number;
    totalWage: number;
    commissionRate: number;
    totalCommission: number;
    expenseAmount: number;
    travelExpense: number;
    setupExpense: number;
    teardownExpense: number;
    otherExpense: number;
    expenseDetailsStr: string;
    totalPay: number;

    // Channel details
    channelId: string;
    channelName: string;
    channelCode: string;
    channelStatus: string;
    startDate: string | null;
    endDate: string | null;
}

interface ChannelOption {
    id: string;
    name: string;
    code: string;
    status: string;
}

interface Props {
    rows: PayrollRow[];
    channels: ChannelOption[];
    salaryAccess: string | null;
}

export function PayrollReportClient({ rows, channels, salaryAccess }: Props) {
    const [search, setSearch] = useState("");
    const [channelFilter, setChannelFilter] = useState("all");
    const [wageFilter, setWageFilter] = useState("all");
    const [commissionFilter, setCommissionFilter] = useState("all");
    const [submissionFilter, setSubmissionFilter] = useState("all");
    const [excludeClosed, setExcludeClosed] = useState(true);

    // Searchable dropdown state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [dropdownSearch, setDropdownSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close searchable dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Check if salary information is visible to the user
    const canView = (paymentType: string) => {
        if (!salaryAccess || salaryAccess === "none") return false;
        if (salaryAccess === "all") return true;
        return salaryAccess === paymentType;
    };

    const mask = (val: number | string, paymentType: string) =>
        !canView(paymentType)
            ? "***"
            : typeof val === "number"
            ? val.toLocaleString()
            : val;

    // Reset channel filter if it's closed and user excludes closed events
    const handleExcludeClosedChange = (checked: boolean) => {
        setExcludeClosed(checked);
        if (checked && channelFilter !== "all") {
            const selectedChan = channels.find((c) => c.id === channelFilter);
            if (selectedChan && selectedChan.status === "closed") {
                setChannelFilter("all");
            }
        }
    };

    // Filtered channels for the searchable dropdown
    const filteredChannelsForDropdown = useMemo(() => {
        let list = channels;
        if (excludeClosed) {
            list = list.filter((c) => c.status !== "closed");
        }
        if (dropdownSearch) {
            const query = dropdownSearch.toLowerCase();
            return list.filter(
                (c) =>
                    c.name.toLowerCase().includes(query) ||
                    c.code.toLowerCase().includes(query)
            );
        }
        return list;
    }, [channels, excludeClosed, dropdownSearch]);

    // Filter logic for table rows
    const filteredRows = useMemo(() => {
        return rows.filter((row) => {
            // Exclude closed events
            if (excludeClosed && row.channelStatus === "closed") {
                return false;
            }

            // Search filter
            if (search) {
                const s = search.toLowerCase();
                const matchName = row.name.toLowerCase().includes(s);
                const matchCode = row.staffCode.toLowerCase().includes(s);
                const matchChannel =
                    row.channelName.toLowerCase().includes(s) ||
                    row.channelCode.toLowerCase().includes(s);
                if (!matchName && !matchCode && !matchChannel) return false;
            }

            // Event/Channel filter
            if (channelFilter !== "all" && row.channelId !== channelFilter) {
                return false;
            }

            // Wage paid filter
            if (wageFilter !== "all") {
                const isPaid = row.isWagePaid;
                if (wageFilter === "paid" && !isPaid) return false;
                if (wageFilter === "unpaid" && isPaid) return false;
            }

            // Commission paid filter
            if (commissionFilter !== "all") {
                const isPaid = row.isCommissionPaid;
                if (commissionFilter === "paid" && !isPaid) return false;
                if (commissionFilter === "unpaid" && isPaid) return false;
            }

            // Submission filter
            if (submissionFilter !== "all") {
                const isSub = row.isSubmitted;
                if (submissionFilter === "submitted" && !isSub) return false;
                if (submissionFilter === "pending" && isSub) return false;
            }

            return true;
        });
    }, [
        rows,
        search,
        channelFilter,
        wageFilter,
        commissionFilter,
        submissionFilter,
        excludeClosed,
    ]);

    // Summary calculations
    const summary = useMemo(() => {
        const totalWage = filteredRows.reduce((sum, r) => sum + r.totalWage, 0);
        const totalCommission = filteredRows.reduce((sum, r) => sum + r.totalCommission, 0);
        const totalExpense = filteredRows.reduce((sum, r) => sum + r.expenseAmount, 0);
        const totalPay = filteredRows.reduce(
            (sum, r) => sum + r.totalWage + r.totalCommission + r.expenseAmount,
            0
        );

        return {
            totalWage,
            totalCommission,
            totalExpense,
            totalPay,
            staffCount: filteredRows.length,
            uniqueEventsCount: new Set(filteredRows.map((r) => r.channelId)).size,
        };
    }, [filteredRows]);

    // Excel Export handler
    const handleExport = async () => {
        try {
            const XLSX = await import("xlsx");
            const data = filteredRows.map((row, i) => ({
                ลำดับ: i + 1,
                "รหัสสาขา/Event": row.channelCode,
                "อีเวนต์/สาขา": row.channelName,
                รหัสพนักงาน: row.staffCode,
                ชื่อพนักงาน: row.name,
                บทบาท: row.role,
                ธนาคาร: row.bankName !== "-" ? row.bankName : "",
                เลขบัญชี: row.bankAccountNo !== "-" ? row.bankAccountNo : "",
                จำนวนวัน: row.daysWorked,
                "ค่าแรง/วัน": row.dailyRate,
                ค่าแรงรวม: row.totalWage,
                ค่าลงงาน: row.setupExpense,
                ค่าเก็บงาน: row.teardownExpense,
                ค่าเดินทาง: row.travelExpense,
                ค่าใช้จ่ายอื่นๆ: row.otherExpense,
                รายละเอียดเบิก: row.expenseDetailsStr,
                ค่าใช้จ่ายเบิก: row.expenseAmount,
                "ค่าแรง+ค่าใช้จ่าย": row.totalWage + row.expenseAmount,
                ค่าคอม: row.totalCommission,
                ยอดโอนรวม: row.totalWage + row.totalCommission + row.expenseAmount,
                โอนค่าแรง: row.isWagePaid ? "โอนแล้ว" : "ยังไม่โอน",
                โอนคอม: row.isCommissionPaid ? "โอนแล้ว" : "ยังไม่โอน",
                สถานะส่งเบิก: row.isSubmitted ? "ส่งแล้ว" : "ยังไม่ส่ง",
            }));

            // Add summary row at the bottom
            data.push({
                ลำดับ: 0,
                "รหัสสาขา/Event": "",
                "อีเวนต์/สาขา": "",
                รหัสพนักงาน: "",
                ชื่อพนักงาน: "รวมทั้งหมด",
                บทบาท: "",
                ธนาคาร: "",
                เลขบัญชี: "",
                จำนวนวัน: 0,
                "ค่าแรง/วัน": 0,
                ค่าแรงรวม: summary.totalWage,
                ค่าลงงาน: filteredRows.reduce((sum, r) => sum + r.setupExpense, 0),
                ค่าเก็บงาน: filteredRows.reduce((sum, r) => sum + r.teardownExpense, 0),
                ค่าเดินทาง: filteredRows.reduce((sum, r) => sum + r.travelExpense, 0),
                ค่าใช้จ่ายอื่นๆ: filteredRows.reduce((sum, r) => sum + r.otherExpense, 0),
                รายละเอียดเบิก: "",
                ค่าใช้จ่ายเบิก: summary.totalExpense,
                "ค่าแรง+ค่าใช้จ่าย": summary.totalWage + summary.totalExpense,
                ค่าคอม: summary.totalCommission,
                ยอดโอนรวม: summary.totalPay,
                โอนค่าแรง: "",
                โอนคอม: "",
                สถานะส่งเบิก: "",
            });

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "รายงานค่าแรง");

            // Set column widths
            ws["!cols"] = [
                { wch: 6 }, // ลำดับ
                { wch: 18 }, // รหัสสาขา/Event
                { wch: 25 }, // อีเวนต์/สาขา
                { wch: 12 }, // รหัสพนักงาน
                { wch: 22 }, // ชื่อพนักงาน
                { wch: 10 }, // บทบาท
                { wch: 15 }, // ธนาคาร
                { wch: 18 }, // เลขบัญชี
                { wch: 10 }, // จำนวนวัน
                { wch: 12 }, // ค่าแรง/วัน
                { wch: 12 }, // ค่าแรงรวม
                { wch: 10 }, // ค่าลงงาน
                { wch: 10 }, // ค่าเก็บงาน
                { wch: 10 }, // ค่าเดินทาง
                { wch: 12 }, // ค่าใช้จ่ายอื่นๆ
                { wch: 35 }, // รายละเอียดเบิก
                { wch: 15 }, // ค่าใช้จ่ายเบิก
                { wch: 16 }, // ค่าแรง+ค่าใช้จ่าย
                { wch: 12 }, // ค่าคอม
                { wch: 16 }, // ยอดโอนรวม
                { wch: 12 }, // โอนค่าแรง
                { wch: 12 }, // โอนคอม
                { wch: 12 }, // สถานะส่งเบิก
            ];

            XLSX.writeFile(
                wb,
                `payroll_report_all_${new Date().toISOString().slice(0, 10)}.xlsx`
            );
        } catch (error) {
            console.error("Failed to export Excel:", error);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <PageHeader
                    icon={Banknote}
                    title="รายงานสรุปค่าแรงทั้งหมด"
                    subtitle="ดูรายละเอียดค่าแรงและค่าใช้จ่ายของพนักงานทุกช่องทางและสาขา"
                />
                <button
                    onClick={handleExport}
                    disabled={filteredRows.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download className="h-4 w-4" /> Export Excel
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">พนักงานทั้งหมด</p>
                    <p className="text-xl font-bold text-slate-700 flex items-center gap-1">
                        <Users className="h-4 w-4 text-slate-400" /> {summary.staffCount} คน
                    </p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">จำนวน Event</p>
                    <p className="text-xl font-bold text-slate-700 flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-slate-400" /> {summary.uniqueEventsCount} Event
                    </p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">ค่าแรงรวม</p>
                    <p className="text-xl font-bold text-slate-700">
                        {mask(summary.totalWage, "daily")}
                    </p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">ค่าคอมรวม</p>
                    <p className="text-xl font-bold text-purple-700">
                        {mask(summary.totalCommission, "daily")}
                    </p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">ค่าใช้จ่ายเบิก</p>
                    <p className="text-xl font-bold text-orange-600">
                        {mask(summary.totalExpense, "daily")}
                    </p>
                </div>
                <div className="bg-gradient-to-r from-emerald-50 to-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-emerald-200">
                    <p className="text-xs text-emerald-600 mb-1">ยอดโอนรวมทั้งหมด</p>
                    <p className="text-xl font-bold text-emerald-700">
                        {mask(summary.totalPay, "daily")}
                    </p>
                </div>
            </div>

            {/* Filter Section */}
            <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                    {/* Search Input */}
                    <div>
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">ค้นหา</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อ, รหัสพนักงาน, Event..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Custom Searchable Event Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Event / สาขา</label>
                        <button
                            type="button"
                            onClick={() => {
                                setIsDropdownOpen(!isDropdownOpen);
                                setDropdownSearch("");
                            }}
                            className="w-full h-10 px-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors cursor-pointer text-left"
                        >
                            <span className="truncate">
                                {channelFilter === "all"
                                    ? "ทุก Event / สาขา"
                                    : channels.find((c) => c.id === channelFilter)?.name || "ทุก Event / สาขา"}
                            </span>
                            <span className="ml-2 text-slate-400 text-[10px]">▼</span>
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute left-0 z-50 mt-1 w-72 rounded-xl border border-slate-100 bg-white p-2 shadow-lg max-h-72 overflow-y-auto">
                                <div className="relative mb-2">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="ค้นหา Event..."
                                        value={dropdownSearch}
                                        onChange={(e) => setDropdownSearch(e.target.value)}
                                        className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-0.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setChannelFilter("all");
                                            setIsDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                            channelFilter === "all"
                                                ? "bg-teal-50 text-teal-700 font-semibold"
                                                : "text-slate-600 hover:bg-slate-50"
                                        }`}
                                    >
                                        ทุก Event / สาขา
                                    </button>
                                    {filteredChannelsForDropdown.map((chan) => (
                                        <button
                                            key={chan.id}
                                            type="button"
                                            onClick={() => {
                                                setChannelFilter(chan.id);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors truncate ${
                                                channelFilter === chan.id
                                                    ? "bg-teal-50 text-teal-700 font-semibold"
                                                    : "text-slate-600 hover:bg-slate-50"
                                            }`}
                                        >
                                            {chan.name} ({chan.code})
                                        </button>
                                    ))}
                                    {filteredChannelsForDropdown.length === 0 && (
                                        <div className="text-center py-4 text-slate-400 text-xs">
                                            ไม่พบ Event
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Exclude Closed Events Checkbox */}
                    <div className="flex items-center gap-2 h-10 px-3 border border-slate-200 bg-slate-50 rounded-xl">
                        <input
                            type="checkbox"
                            id="excludeClosed"
                            checked={excludeClosed}
                            onChange={(e) => handleExcludeClosedChange(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <label
                            htmlFor="excludeClosed"
                            className="text-xs text-slate-600 font-medium cursor-pointer select-none truncate"
                        >
                            ไม่รวม Event ที่ปิดงาน
                        </label>
                    </div>

                    {/* Wage Payment Filter */}
                    <div>
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">ค่าแรง</label>
                        <select
                            value={wageFilter}
                            onChange={(e) => setWageFilter(e.target.value)}
                            className="w-full h-10 px-3 pr-8 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat"
                        >
                            <option value="all">ทั้งหมด</option>
                            <option value="paid">โอนแล้ว</option>
                            <option value="unpaid">ยังไม่โอน</option>
                        </select>
                    </div>

                    {/* Commission Payment Filter */}
                    <div>
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">ค่าคอมฯ</label>
                        <select
                            value={commissionFilter}
                            onChange={(e) => setCommissionFilter(e.target.value)}
                            className="w-full h-10 px-3 pr-8 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat"
                        >
                            <option value="all">ทั้งหมด</option>
                            <option value="paid">โอนแล้ว</option>
                            <option value="unpaid">ยังไม่โอน</option>
                        </select>
                    </div>

                    {/* Submission status filter */}
                    <div>
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">สถานะส่งเบิก</label>
                        <select
                            value={submissionFilter}
                            onChange={(e) => setSubmissionFilter(e.target.value)}
                            className="w-full h-10 px-3 pr-8 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat"
                        >
                            <option value="all">ทั้งหมด</option>
                            <option value="submitted">ส่งแล้ว</option>
                            <option value="pending">รอส่ง</option>
                        </select>
                    </div>
                </div>
                {filteredRows.length !== rows.length && (
                    <p className="text-xs text-slate-400 mt-2">
                        พบ {filteredRows.length} จาก {rows.length} รายการ
                    </p>
                )}
            </div>

            {/* Table Details */}
            <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-slate-400" />
                        รายละเอียดโอนเงิน
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    {filteredRows.length === 0 ? (
                        <div className="p-8">
                            <EmptyState
                                message="ไม่พบข้อมูลค่าแรง"
                                description="ลองเปลี่ยนเงื่อนไขหรือค้นหาใหม่อีกครั้ง"
                            />
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                    <th className="px-3 py-3 text-center w-12">ค่าแรง</th>
                                    <th className="px-3 py-3 text-center w-12">คอม</th>
                                    <th className="px-3 py-3 text-center w-16">สถานะ</th>
                                    <th className="px-3 py-3 w-16">รหัส</th>
                                    <th className="px-3 py-3">ชื่อพนักงาน</th>
                                    <th className="px-3 py-3 w-28">รหัสสาขา</th>
                                    <th className="px-3 py-3">อีเวนต์/สาขา</th>
                                    <th className="px-3 py-3">บัญชีธนาคาร</th>
                                    <th className="px-3 py-3 text-center w-12">วัน</th>
                                    <th className="px-3 py-3 text-right">ค่าแรง/วัน</th>
                                    <th className="px-3 py-3 text-right">ค่าแรงรวม</th>
                                    <th className="px-3 py-3 text-right">เบิกค่าใช้จ่าย</th>
                                    <th className="px-3 py-3 text-right bg-blue-50/10 border-l border-r border-slate-100">
                                        ค่าแรง+เบิก
                                    </th>
                                    <th className="px-3 py-3 text-right">ค่าคอม</th>
                                    <th className="px-3 py-3 text-right font-bold bg-emerald-50/10 border-l border-slate-100">
                                        ยอดโอนรวม
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.map((row) => {
                                    const bothPaid = row.isWagePaid && row.isCommissionPaid;
                                    return (
                                        <tr
                                            key={row.channelStaffId}
                                            className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                                        >
                                            {/* Wage paid status */}
                                            <td className="px-3 py-3 text-center">
                                                {row.isWagePaid ? (
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                                                ) : (
                                                    <Circle className="h-4 w-4 text-slate-300 mx-auto" />
                                                )}
                                            </td>
                                            {/* Commission paid status */}
                                            <td className="px-3 py-3 text-center">
                                                {row.isCommissionPaid ? (
                                                    <CheckCircle2 className="h-4 w-4 text-purple-600 mx-auto" />
                                                ) : (
                                                    <Circle className="h-4 w-4 text-slate-300 mx-auto" />
                                                )}
                                            </td>
                                            {/* Submission status */}
                                            <td className="px-3 py-3 text-center">
                                                {row.isSubmitted ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                                        <FileCheck className="h-3 w-3" /> ส่งแล้ว
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full">
                                                        <Clock className="h-3 w-3" /> รอส่ง
                                                    </span>
                                                )}
                                            </td>
                                            {/* Staff Code */}
                                            <td className="px-3 py-3 font-mono text-slate-500">
                                                {row.staffCode}
                                            </td>
                                            {/* Staff Name */}
                                            <td className="px-3 py-3">
                                                <Link
                                                    href={`/hr/payroll/${row.channelId}/staff/${row.staffId}`}
                                                    className="hover:underline"
                                                >
                                                    <span
                                                        className={`font-medium ${
                                                            bothPaid ? "text-slate-500" : "text-blue-700"
                                                        }`}
                                                    >
                                                        {row.name}
                                                    </span>
                                                </Link>
                                                {row.isMain && (
                                                    <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                                                        หัวหน้า
                                                    </span>
                                                )}
                                                {row.isWagePaid && row.wagePaidAt && (
                                                    <span className="block text-[10px] text-blue-400 mt-0.5">
                                                        โอนค่าแรง{" "}
                                                        {format(
                                                            new Date(row.wagePaidAt),
                                                            "d MMM HH:mm",
                                                            { locale: th }
                                                        )}
                                                    </span>
                                                )}
                                                {row.isCommissionPaid && row.commissionPaidAt && (
                                                    <span className="block text-[10px] text-purple-400">
                                                        โอนคอม{" "}
                                                        {format(
                                                            new Date(row.commissionPaidAt),
                                                            "d MMM HH:mm",
                                                            { locale: th }
                                                        )}
                                                    </span>
                                                )}
                                            </td>
                                            {/* Channel Code */}
                                            <td className="px-3 py-3 font-mono text-slate-500 text-[11px]">
                                                {row.channelCode}
                                            </td>
                                            {/* Event/Channel Name */}
                                            <td className="px-3 py-3">
                                                <Link
                                                    href={`/hr/payroll/${row.channelId}`}
                                                    className="hover:underline"
                                                >
                                                    <span className="font-semibold text-slate-700">
                                                        {row.channelName}
                                                    </span>
                                                </Link>
                                            </td>
                                            {/* Bank Account */}
                                            <td className="px-3 py-3">
                                                {row.bankName !== "-" ? (
                                                    <div>
                                                        <span className="text-xs text-slate-500">
                                                            {row.bankName}
                                                        </span>
                                                        <span className="block font-mono text-sm text-slate-800 tracking-wider">
                                                            {row.bankAccountNo !== "-"
                                                                ? row.bankAccountNo
                                                                : ""}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">
                                                        ยังไม่ระบุ
                                                    </span>
                                                )}
                                            </td>
                                            {/* Days worked */}
                                            <td className="px-3 py-3 text-center text-slate-600">
                                                {row.daysWorked}
                                            </td>
                                            {/* Daily Rate */}
                                            <td className="px-3 py-3 text-right text-slate-600">
                                                {mask(row.dailyRate, row.paymentType)}
                                            </td>
                                            {/* Total Wage */}
                                            <td
                                                className={`px-3 py-3 text-right font-medium ${
                                                    row.isWagePaid
                                                        ? "text-slate-400 line-through"
                                                        : "text-slate-700"
                                                }`}
                                            >
                                                {mask(row.totalWage, row.paymentType)}
                                            </td>
                                            {/* Expense Amount */}
                                            <td
                                                className={`px-3 py-3 text-right ${
                                                    row.isWagePaid
                                                        ? "text-slate-400 line-through"
                                                        : "text-orange-600"
                                                }`}
                                            >
                                                {!canView(row.paymentType)
                                                    ? "***"
                                                    : row.expenseAmount > 0
                                                    ? row.expenseAmount.toLocaleString()
                                                    : "-"}
                                            </td>
                                            {/* Wage + Expense */}
                                            <td
                                                className={`px-3 py-3 text-right font-semibold border-l border-r border-slate-100 ${
                                                    row.isWagePaid
                                                        ? "text-slate-400 line-through bg-blue-50/10"
                                                        : "text-blue-700 bg-blue-50/20"
                                                }`}
                                            >
                                                {!canView(row.paymentType)
                                                    ? "***"
                                                    : row.totalWage + row.expenseAmount > 0
                                                    ? `฿${(
                                                          row.totalWage + row.expenseAmount
                                                      ).toLocaleString()}`
                                                    : "-"}
                                            </td>
                                            {/* Commission */}
                                            <td
                                                className={`px-3 py-3 text-right ${
                                                    row.isCommissionPaid
                                                        ? "text-slate-400 line-through"
                                                        : "text-purple-600"
                                                }`}
                                            >
                                                {!canView(row.paymentType)
                                                    ? "***"
                                                    : row.totalCommission > 0
                                                    ? row.totalCommission.toLocaleString()
                                                    : "-"}
                                            </td>
                                            {/* Total Pay with Expense */}
                                            <td
                                                className={`px-3 py-3 text-right font-bold border-l border-slate-100 ${
                                                    bothPaid
                                                        ? "text-emerald-500 line-through text-slate-400"
                                                        : "text-emerald-700 bg-emerald-50/20"
                                                }`}
                                            >
                                                {!canView(row.paymentType)
                                                    ? "***"
                                                    : `฿${(
                                                          row.totalWage +
                                                          row.totalCommission +
                                                          row.expenseAmount
                                                      ).toLocaleString()}`}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                                <tr className="text-slate-700">
                                    <td colSpan={8} className="px-3 py-3 text-right font-bold">
                                        รวมทั้งหมด
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        {filteredRows.reduce((sum, r) => sum + r.daysWorked, 0)}
                                    </td>
                                    <td className="px-3 py-3"></td>
                                    <td className="px-3 py-3 text-right font-bold text-slate-700">
                                        {mask(summary.totalWage, "daily")}
                                    </td>
                                    <td className="px-3 py-3 text-right font-bold text-orange-600">
                                        {mask(summary.totalExpense, "daily")}
                                    </td>
                                    <td className="px-3 py-3 text-right font-bold text-blue-700 bg-blue-50/10 border-l border-r border-slate-100">
                                        {mask(
                                            summary.totalWage + summary.totalExpense,
                                            "daily"
                                        )}
                                    </td>
                                    <td className="px-3 py-3 text-right font-bold text-purple-700">
                                        {mask(summary.totalCommission, "daily")}
                                    </td>
                                    <td className="px-3 py-3 text-right font-bold text-emerald-700 bg-emerald-50/10 border-l border-slate-100 text-sm">
                                        {mask(summary.totalPay, "daily")}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
