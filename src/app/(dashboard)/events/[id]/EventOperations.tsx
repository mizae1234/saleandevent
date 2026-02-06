"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { closeEvent } from "@/actions/event-actions";
import { Package, Power, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type Props = {
    eventId: string;
    status: string;
};

export function EventOperations({ eventId, status }: Props) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleCloseEvent = () => {
        startTransition(async () => {
            try {
                await closeEvent(eventId);
            } catch (e) {
                console.error(e);
                alert("Failed to close event");
            }
        });
    };

    const isPackable = status === "approved" || status === "packing";
    // Show 'Close Event' if shipped or ready to sell/completed (if we want to allow re-closing or just showing specific states)
    // Actually, usually 'shipped' -> 'completed'.
    // If status is 'shipped', allow closing.
    const isCloseable = status === "shipped";
    const isClosed = status === "completed";

    return (
        <div className="rounded-xl bg-white p-6 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] h-full">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">การดำเนินการ</h3>

            <div className="space-y-3">
                {/* Pack Goods Button */}
                {isPackable ? (
                    <Link href={`/events/${eventId}/packing`} className="block">
                        <div className="flex items-center p-3 rounded-lg border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer group">
                            <div className="h-10 w-10 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                                <Package className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-medium text-indigo-900">แพคสินค้า</h4>
                                <p className="text-xs text-indigo-600">จัดการรายการเบิกและแพคของ</p>
                            </div>
                        </div>
                    </Link>
                ) : status === "packed" ? (
                    <div className="flex items-center p-3 rounded-lg border border-teal-100 bg-teal-50">
                        <div className="h-10 w-10 rounded-full bg-teal-200 text-teal-700 flex items-center justify-center mr-3">
                            <CheckCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="font-medium text-teal-900">แพคเสร็จแล้ว</h4>
                            <p className="text-xs text-teal-600">รอการจัดส่ง</p>
                        </div>
                    </div>
                ) : null}

                {/* Close Event Button */}
                {isCloseable && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full justify-start h-auto py-3 px-3 border-slate-200 hover:bg-slate-50 text-slate-700"
                            >
                                <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mr-3">
                                    <Power className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-medium text-slate-900">ปิดอีเวนท์</h4>
                                    <p className="text-xs text-slate-500">เมื่อจบงานและคืนของครบแล้ว</p>
                                </div>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>ยืนยันปิดอีเวนท์?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    การปิดอีเวนท์หมายถึงงานเสร็จสิ้นสมบูรณ์แล้ว คุณจะไม่สามารถแก้ไขข้อมูลได้อีก
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCloseEvent} className="bg-slate-900 text-white hover:bg-slate-800" disabled={isPending}>
                                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    ยืนยันปิดงาน
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}

                {isClosed && (
                    <div className="flex items-center p-3 rounded-lg border border-slate-100 bg-slate-50">
                        <div className="h-10 w-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mr-3">
                            <CheckCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="font-medium text-slate-700">ปิดงานแล้ว</h4>
                            <p className="text-xs text-slate-500">งานเสร็จสิ้นสมบูรณ์</p>
                        </div>
                    </div>
                )}

                {!isPackable && !isCloseable && !isClosed && status !== 'packed' && (
                    <div className="text-center py-4 text-sm text-slate-400">
                        ไม่มีการดำเนินการในขั้นตอนนี้
                    </div>
                )}
            </div>
        </div>
    );
}
