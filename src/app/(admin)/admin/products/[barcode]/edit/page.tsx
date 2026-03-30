import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ProductForm } from "../../ProductForm";
import { getProductCategories } from "@/actions/product-category-actions";

export default async function EditProductPage({ params }: { params: Promise<{ barcode: string }> }) {
    const { barcode } = await params;
    const decodedBarcode = decodeURIComponent(barcode);

    const [product, categoryRes] = await Promise.all([
        db.product.findUnique({
            where: { barcode: decodedBarcode },
        }),
        getProductCategories(true)
    ]);

    if (!product) {
        notFound();
    }

    return (
        <ProductForm
            mode="edit"
            categories={categoryRes.data || []}
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
