"use client";

import Link from "next/link";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { useState } from "react";
import { fmt } from "@/lib/utils";
import { getChannelStatus } from "@/config/status";

interface ChannelData {
    id: string;
    name: string;
    code: string;
    type: string;
    status: string;
    location: string;
    sales: number;
    expenses: number;
    profit: number;
    margin: number;
}

interface Props {
    data: ChannelData[];
}

type SortKey = "sales" | "profit" | "margin" | "expenses";

export function BranchTable({ data }: Props) {
    const [sortKey, setSortKey] = useState<SortKey>("sales");
    const [sortAsc, setSortAsc] = useState(false);

    const sorted = [...data].sort((a, b) => {
        const mul = sortAsc ? 1 : -1;
        return (a[sortKey] - b[sortKey]) * mul;
    });

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortAsc(!sortAsc);
        else {
            setSortKey(key);
            setSortAsc(false);
        }
    };

    const SortHeader = ({ k, label }: { k: SortKey; label: string }) => (
        <button
            onClick={() => toggleSort(k)}
            className={`inline-flex items-center gap-1 font-semibold text-xs uppercase tracking-wider ${sortKey === k ? "text-teal-700" : "text-slate-600"
                }`}
        >
            {label}
            <ArrowUpDown className="h-3 w-3" />
        </button>
    );

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">🏪 ผลงานสาขา</h3>
                <div className="py-12 text-center text-slate-400">ไม่มีข้อมูลสาขาในช่วงนี้</div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 pb-3">
                <h3 className="text-lg font-bold text-slate-900">🏪 ผลงานสาขา</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-t border-slate-100 bg-slate-50/50">
                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                สาขา
                            </th>
                            <th className="text-right px-4 py-3">
                                <SortHeader k="sales" label="ยอดขาย" />
                            </th>
                            <th className="text-right px-4 py-3">
                                <SortHeader k="expenses" label="ค่าใช้จ่าย" />
                            </th>
                            <th className="text-right px-4 py-3">
                                <SortHeader k="profit" label="กำไร" />
                            </th>
                            <th className="text-right px-4 py-3">
                                <SortHeader k="margin" label="Margin" />
                            </th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                สถานะ
                            </th>
                            <th className="px-4 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {sorted.map((ch) => (
                            <tr key={ch.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-3">
                                    <div className="font-medium text-slate-900">{ch.name}</div>
                                    <div className="text-xs text-slate-400">{ch.code} · {ch.location}</div>
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-slate-900">
                                    ฿{fmt(ch.sales)}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-600">
                                    ฿{fmt(ch.expenses)}
                                </td>
                                <td className={`px-4 py-3 text-right font-semibold ${ch.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                    ฿{fmt(ch.profit)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span
                                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ch.margin >= 30
                                                ? "bg-emerald-50 text-emerald-700"
                                                : ch.margin >= 10
                                                    ? "bg-amber-50 text-amber-700"
                                                    : "bg-red-50 text-red-600"
                                            }`}
                                    >
                                        {ch.margin.toFixed(1)}%
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {(() => { const s = getChannelStatus(ch.status); return (
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                                        {s.label}
                                    </span>
                                    ); })()}
                                </td>
                                <td className="px-4 py-3">
                                    <Link
                                        href={`/channels/${ch.id}`}
                                        className="text-slate-400 hover:text-teal-600 transition-colors"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
