"use client";

import { useState, useRef } from "react";
import { Image as ImageIcon, Upload, Trash2, Link as LinkIcon, AlertCircle } from "lucide-react";
import { uploadCompanyLogo } from "@/actions/company-setting-actions";
import { Spinner, FormInput } from "@/components/shared";
import { useToast } from "@/components/ui/toast";

interface Props {
    logoUrl: string;
    setLogoUrl: (val: string) => void;
}

export function LogoUploadSection({ logoUrl, setLogoUrl }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [imageError, setImageError] = useState(false);
    const { toastError, toastSuccess } = useToast();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setImageError(false);

        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await uploadCompanyLogo(formData);

            if (res.error) {
                toastError(res.error);
            } else if (res.url) {
                setLogoUrl(res.url);
                toastSuccess("อัปโหลดโลโก้สำเร็จ");
            }
        } catch (err: any) {
            toastError(err.message || "เกิดข้อผิดพลาดในการอัปโหลด");
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="h-9 w-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                    <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-base font-semibold text-slate-900">โลโก้ร้านค้า / บริษัท</h2>
                    <p className="text-xs text-slate-500">สำหรับแสดงบนหัวบิล POS, เอกสารใบกำกับภาษี และใบลดหนี้</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Preview Box */}
                <div className="relative group w-36 h-36 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center overflow-hidden shrink-0 transition-all hover:border-teal-400">
                    {logoUrl && !imageError ? (
                        <>
                            <img
                                src={logoUrl}
                                alt="Company Logo"
                                className="w-full h-full object-contain p-2"
                                onError={() => setImageError(true)}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    setLogoUrl("");
                                    setImageError(false);
                                }}
                                className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                                title="ลบโลโก้"
                            >
                                <Trash2 className="h-5 w-5 text-rose-300" />
                                <span className="text-[11px] font-medium">ลบรูป</span>
                            </button>
                        </>
                    ) : (
                        <div className="text-center p-3">
                            <ImageIcon className="h-8 w-8 text-slate-300 mx-auto mb-1" />
                            <span className="text-[11px] text-slate-400 font-medium">ยังไม่มีโลโก้</span>
                        </div>
                    )}

                    {uploading && (
                        <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-2 z-10">
                            <Spinner size="md" />
                            <span className="text-xs text-slate-600 font-medium">กำลังอัปโหลด...</span>
                        </div>
                    )}
                </div>

                {/* Upload & Link Controls */}
                <div className="flex-1 space-y-3 w-full">
                    <div className="flex flex-wrap items-center gap-3">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={uploading}
                        />

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-50 text-teal-700 text-xs font-semibold hover:bg-teal-100 transition-colors disabled:opacity-50"
                        >
                            <Upload className="h-4 w-4" />
                            {logoUrl ? "เปลี่ยนรูปโลโก้" : "อัปโหลดรูปโลโก้"}
                        </button>

                        {logoUrl && (
                            <button
                                type="button"
                                onClick={() => {
                                    setLogoUrl("");
                                    setImageError(false);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                                นำรูปออก
                            </button>
                        )}
                    </div>

                    <p className="text-[11px] text-slate-400">
                        รองรับไฟล์ JPG, PNG, WebP, SVG ขนาดไม่เกิน 5MB (แนะนำรูปทรงสี่เหลี่ยมจัตุรัส หรือ สี่เหลี่ยมผืนผ้าแนวนอน พื้นหลังโปร่งใส)
                    </p>

                    {/* Direct URL input */}
                    <div className="pt-1">
                        <FormInput
                            label="หรือระบุ URL รูปภาพโดยตรง"
                            name="logoUrl"
                            value={logoUrl}
                            onChange={(e) => {
                                setLogoUrl(e.target.value);
                                setImageError(false);
                            }}
                            placeholder="https://example.com/logo.png"
                            icon={LinkIcon}
                        />
                    </div>

                    {imageError && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>ไม่สามารถโหลดรูปภาพจาก URL ที่ระบุได้ กรุณาตรวจสอบลิงก์อีกครั้ง</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
