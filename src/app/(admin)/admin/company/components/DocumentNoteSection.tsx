"use client";

import { FileText } from "lucide-react";
import { FormTextarea } from "@/components/shared";

interface Props {
    footerNote: string;
    setFooterNote: (val: string) => void;
}

export function DocumentNoteSection({ footerNote, setFooterNote }: Props) {
    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <FileText className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-base font-semibold text-slate-900">ข้อความและหมายเหตุท้ายเอกสาร</h2>
                    <p className="text-xs text-slate-500">ข้อความที่จะพิมพ์ไว้ท้ายเอกสาร เช่น เงื่อนไขการรับประกัน หรือเงื่อนไขการชำระเงิน</p>
                </div>
            </div>

            <FormTextarea
                label="หมายเหตุท้ายเอกสาร / สลิปใบเสร็จ"
                name="footerNote"
                value={footerNote}
                onChange={(e) => setFooterNote(e.target.value)}
                rows={3}
                placeholder="เช่น สินค้าซื้อแล้วไม่รับเปลี่ยนคืนเกิน 7 วัน กรุณาแสดงใบเสร็จทุกครั้งเมื่อติดต่อสอบถาม"
            />
        </div>
    );
}
