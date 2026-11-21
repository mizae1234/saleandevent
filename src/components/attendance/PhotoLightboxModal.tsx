"use client";

import { X } from "lucide-react";

export interface PhotoLightboxData {
    url: string;
    title?: string;
    subtitle?: string;
}

interface PhotoLightboxModalProps {
    photo: PhotoLightboxData | null;
    onClose: () => void;
}

export function PhotoLightboxModal({ photo, onClose }: PhotoLightboxModalProps) {
    if (!photo) return null;

    return (
        <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-bold">{photo.title || "ภาพถ่ายการลงเวลา"}</h4>
                        {photo.subtitle && (
                            <p className="text-xs text-slate-300">{photo.subtitle}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 text-slate-300 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={photo.url}
                    alt={photo.title || "Attendance photo"}
                    className="w-full max-h-[75vh] object-contain bg-black"
                />
            </div>
        </div>
    );
}
