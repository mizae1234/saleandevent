"use client";

import { MapPin, Phone, Mail, Globe } from "lucide-react";
import { FormInput, FormTextarea } from "@/components/shared";

interface Props {
    address: string;
    setAddress: (val: string) => void;
    phone: string;
    setPhone: (val: string) => void;
    email: string;
    setEmail: (val: string) => void;
    website: string;
    setWebsite: (val: string) => void;
}

export function ContactInfoSection({
    address,
    setAddress,
    phone,
    setPhone,
    email,
    setEmail,
    website,
    setWebsite,
}: Props) {
    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <MapPin className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-base font-semibold text-slate-900">ข้อมูลติดต่อและที่อยู่</h2>
                    <p className="text-xs text-slate-500">ที่อยู่จะแสดงบนหัวบิลและเอกสารภาษี</p>
                </div>
            </div>

            <FormTextarea
                label="ที่อยู่สถานประกอบการ (สำหรับออกใบกำกับภาษี)"
                name="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                placeholder="เช่น 5/204 ถนนเทศบาลสงเคราะห์ แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormInput
                    label="เบอร์โทรศัพท์ติดต่อ"
                    name="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="เช่น 02-xxx-xxxx หรือ 08x-xxx-xxxx"
                    icon={Phone}
                />

                <FormInput
                    label="อีเมล"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@company.com"
                    icon={Mail}
                />

                <FormInput
                    label="เว็บไซต์"
                    name="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://www.yourshop.com"
                    icon={Globe}
                />
            </div>
        </div>
    );
}
