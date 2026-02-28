import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { CustomerForm } from "../../CustomerForm";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const customer = await db.customer.findUnique({ where: { id } });
    if (!customer) return notFound();

    return (
        <CustomerForm
            isEdit
            customer={{
                id: customer.id,
                code: customer.code,
                taxId: customer.taxId,
                name: customer.name,
                address: customer.address,
                phone: customer.phone,
                creditTerm: customer.creditTerm,
                referenceNo: customer.referenceNo,
                discountPercent: Number(customer.discountPercent),
            }}
        />
    );
}
