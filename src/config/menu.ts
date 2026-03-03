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
    UserCog,
    Gift,
    Settings,
    Contact,
    LayoutDashboard,
    LucideIcon
} from "lucide-react";

export interface MenuItem {
    title: string;
    href: string;
    icon: LucideIcon;
    description?: string;
}

export interface MenuSection {
    key: string;
    title: string;
    items: MenuItem[];
}

export const MENU_SECTIONS: MenuSection[] = [
    {
        key: "front_office",
        title: "Front Office (หน้าร้าน)",
        items: [
            { title: "ขายสินค้า (POS)", href: "/pc/pos", icon: ScanBarcode },
            { title: "รายการขาย", href: "/pc/sales", icon: History },
            { title: "รับสินค้าเข้า", href: "/pc/receive", icon: PackageCheck },
            { title: "เบิกของเพิ่ม", href: "/pc/refill", icon: RefreshCw },
            { title: "ปิดยอด/ส่งคืน", href: "/pc/close", icon: LogOut },
        ],
    },
    {
        key: "sales_channel",
        title: "Sales Channel (ช่องทางขาย)",
        items: [
            { title: "Dashboard", href: "/", icon: LayoutDashboard },
            { title: "ภาพรวมช่องทาง", href: "/channels", icon: Calendar },
            { title: "เปิดช่องทางใหม่", href: "/channels/create", icon: PlusCircle },
            { title: "รออนุมัติ", href: "/channels/approvals", icon: Clock },
            { title: "บันทึกค่าใช้จ่าย", href: "/channels/expenses", icon: Receipt },
        ],
    },
    {
        key: "supply_chain",
        title: "Supply Chain (คลังสินค้า)",
        items: [
            { title: "งานรอแพ็ค", href: "/warehouse/packing", icon: Package },
            { title: "รายการจัดส่ง", href: "/warehouse/shipments", icon: Truck },
            { title: "รับคืนสินค้า", href: "/warehouse/return", icon: Undo2 },
        ],
    },
    {
        key: "finance",
        title: "Finance (บัญชี)",
        items: [
            { title: "Owner Dashboard", href: "/dashboard/owner", icon: LayoutDashboard },
            { title: "จัดการลูกค้า", href: "/finance/customers", icon: Contact },
            { title: "ใบแจ้งหนี้ (Invoice)", href: "/finance/invoices", icon: FileText },
        ],
    },
    {
        key: "hr",
        title: "HR (บุคคล)",
        items: [
            { title: "จัดการพนักงาน", href: "/hr/employees", icon: UserCog },
            { title: "เงินเดือน/คอมฯ", href: "/hr/payroll", icon: Banknote },
        ],
    },
    {
        key: "system_admin",
        title: "System Admin (ตั้งค่า)",
        items: [
            { title: "จัดการสินค้า", href: "/admin/products", icon: Tag },
            { title: "พนักงาน & สิทธิ์", href: "/admin/users", icon: Users },
        ],
    },
];

// Helper: map a route prefix to its menu section key
export const ROUTE_TO_MENU_KEY: Record<string, string> = {
    "/": "sales_channel",
    "/pc": "front_office",
    "/channels": "sales_channel",
    "/warehouse": "supply_chain",
    "/finance": "finance",
    "/hr": "hr",
    "/reports": "finance",
    "/dashboard": "finance",
    "/admin": "system_admin",
};
