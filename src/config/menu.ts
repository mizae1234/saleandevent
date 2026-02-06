import {
    Store,
    ScanBarcode,
    History,
    PackageCheck,
    Package,
    LogOut,
    Calendar,
    PlusCircle,
    Clock,
    RefreshCw,
    Receipt,
    Truck,
    Undo2,
    Warehouse,
    ClipboardCheck,
    FileText,
    Banknote,
    PieChart,
    Tag,
    Users,
    Gift,
    Settings,
    LucideIcon
} from "lucide-react";

export interface MenuItem {
    title: string;
    href: string;
    icon: LucideIcon;
    description?: string;
}

export interface MenuSection {
    title: string;
    items: MenuItem[];
}

export const MENU_SECTIONS: MenuSection[] = [
    {
        title: "Front Office (หน้าร้าน)",
        items: [
            { title: "ขายสินค้า (POS)", href: "/pc/pos", icon: ScanBarcode },
            { title: "รายการขาย", href: "/pc/sales", icon: History },
            { title: "รับสินค้าเข้า", href: "/pc/receive", icon: PackageCheck },
            { title: "สต็อกหน้าร้าน", href: "/pc/stock", icon: Store },
            { title: "ปิดยอด/ส่งคืน", href: "/pc/closing", icon: LogOut },
        ],
    },
    {
        title: "Event Management (จัดงาน)",
        items: [
            { title: "ภาพรวมกิจกรรม", href: "/events", icon: Calendar },
            { title: "ขอเปิด Event ใหม่", href: "/events/create", icon: PlusCircle },
            { title: "รออนุมัติ", href: "/events/approvals", icon: Clock },
            { title: "เบิกของเพิ่ม", href: "/events/refill", icon: RefreshCw },
            { title: "บันทึกค่าใช้จ่าย", href: "/events/expenses", icon: Receipt },
        ],
    },
    {
        title: "Supply Chain (คลังสินค้า)",
        items: [
            { title: "งานรอแพ็ค", href: "/warehouse/packing", icon: Package },
            { title: "รายการจัดส่ง", href: "/warehouse/shipments", icon: Truck },
            { title: "รับคืนสินค้า", href: "/warehouse/returns", icon: Undo2 },
            { title: "คลังสินค้าหลัก", href: "/warehouse/stock", icon: Warehouse },
        ],
    },
    {
        title: "Finance & HR (บัญชี/บุคคล)",
        items: [
            { title: "ตรวจสอบการปิดงาน", href: "/finance/audit", icon: ClipboardCheck },
            { title: "รายการเดินบัญชี", href: "/finance/invoices", icon: FileText },
            { title: "เงินเดือน/คอมฯ", href: "/hr/payroll", icon: Banknote },
            { title: "รายงานสรุป", href: "/reports", icon: PieChart },
        ],
    },
    {
        title: "System Admin (ตั้งค่า)",
        items: [
            { title: "จัดการสินค้า", href: "/admin/products", icon: Tag },
            { title: "พนักงาน & สิทธิ์", href: "/admin/users", icon: Users },
            { title: "โปรโมชั่น", href: "/admin/promotions", icon: Gift },
            { title: "ข้อมูลสาขา", href: "/admin/branches", icon: Settings },
        ],
    },
];
