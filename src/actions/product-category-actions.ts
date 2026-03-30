"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Get all product categories, ordered by sortOrder
 * @param activeOnly If true, returns only categories with isActive = true
 */
export async function getProductCategories(activeOnly: boolean = false) {
    try {
        const categories = await db.productCategory.findMany({
            where: activeOnly ? { isActive: true } : undefined,
            orderBy: [
                { sortOrder: "asc" },
                { name: "asc" }
            ],
        });
        return { success: true, data: categories };
    } catch (error) {
        console.error("Failed to fetch product categories:", error);
        return { success: false, error: "ไม่สามารถดึงข้อมูลหมวดหมู่สินค้าได้" };
    }
}

/**
 * Create a new product category
 */
export async function createProductCategory(formData: FormData) {
    try {
        const name = formData.get("name") as string;
        const sortOrderStr = formData.get("sortOrder") as string;
        
        if (!name) {
            return { error: "กรุณาระบุชื่อหมวดหมู่" };
        }

        const sortOrder = parseInt(sortOrderStr) || 0;

        // Check for duplicates
        const existing = await db.productCategory.findUnique({
            where: { name },
        });

        if (existing) {
            return { error: "มีหมวดหมู่นี้ในระบบแล้ว" };
        }

        await db.productCategory.create({
            data: {
                name,
                sortOrder,
                isActive: true,
            },
        });

        revalidatePath("/admin/product-categories");
        revalidatePath("/admin/products");
        revalidatePath("/admin/products/create");
        
        return { success: true };
    } catch (error) {
        console.error("Failed to create product category:", error);
        return { error: "เกิดข้อผิดพลาดในการสร้างหมวดหมู่สินค้า" };
    }
}

/**
 * Update an existing product category
 */
export async function updateProductCategory(id: string, formData: FormData) {
    try {
        const name = formData.get("name") as string;
        const sortOrderStr = formData.get("sortOrder") as string;
        
        if (!name) {
            return { error: "กรุณาระบุชื่อหมวดหมู่" };
        }

        const sortOrder = parseInt(sortOrderStr) || 0;

        // Check for duplicates with different ID
        const existing = await db.productCategory.findFirst({
            where: { 
                name,
                id: { not: id } 
            },
        });

        if (existing) {
            return { error: "มีหมวดหมู่นี้ในระบบแล้ว" };
        }

        await db.productCategory.update({
            where: { id },
            data: {
                name,
                sortOrder,
            },
        });

        revalidatePath("/admin/product-categories");
        revalidatePath("/admin/products");
        revalidatePath("/admin/products/create");
        
        return { success: true };
    } catch (error) {
        console.error("Failed to update product category:", error);
        return { error: "เกิดข้อผิดพลาดในการแก้ไขหมวดหมู่สินค้า" };
    }
}

/**
 * Toggle category active status (soft delete)
 */
export async function toggleProductCategoryStatus(id: string, isActive: boolean) {
    try {
        await db.productCategory.update({
            where: { id },
            data: { isActive },
        });

        revalidatePath("/admin/product-categories");
        revalidatePath("/admin/products");
        revalidatePath("/admin/products/create");
        
        return { success: true };
    } catch (error) {
        console.error("Failed to toggle product category status:", error);
        return { error: "เกิดข้อผิดพลาดในการเปลี่ยนสถานะหมวดหมู่สินค้า" };
    }
}
