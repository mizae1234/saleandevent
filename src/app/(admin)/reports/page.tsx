import { ReportsClient } from "./ReportsClient";

export const metadata = {
    title: "รายงาน | Saran Jeans",
    description: "รายงานสรุปยอดขาย สินค้าที่ขายทั้งหมด และสินค้าคงเหลือ",
};

export default function ReportsPage() {
    return <ReportsClient />;
}
