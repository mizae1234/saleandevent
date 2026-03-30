import { ProductForm } from "../ProductForm";
import { getProductCategories } from "@/actions/product-category-actions";

export default async function CreateProductPage() {
    const categoryRes = await getProductCategories(true);
    return <ProductForm mode="create" categories={categoryRes.data || []} />;
}
