import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ProductForm } from "../../ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ barcode: string }> }) {
    const { barcode } = await params;
    const decodedBarcode = decodeURIComponent(barcode);

    const product = await db.product.findUnique({
        where: { barcode: decodedBarcode },
    });

    if (!product) {
        notFound();
    }

    return (
        <ProductForm
            mode="edit"
            product={{
                barcode: product.barcode,
                code: product.code,
                name: product.name,
                size: product.size,
                price: product.price ? Number(product.price) : null,
                category: product.category,
                producttype: product.producttype,
                color: product.color,
            }}
        />
    );
}
