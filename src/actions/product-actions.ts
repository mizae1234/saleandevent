'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ============ CREATE ============

export async function createProduct(formData: FormData) {
    try {
        const barcode = (formData.get('barcode') as string)?.trim();
        const code = (formData.get('code') as string)?.trim() || null;
        const name = (formData.get('name') as string)?.trim();
        const size = (formData.get('size') as string)?.trim() || null;
        const priceStr = formData.get('price') as string | null;
        const category = (formData.get('category') as string)?.trim() || null;
        const producttype = (formData.get('producttype') as string)?.trim() || null;
        const color = (formData.get('color') as string)?.trim() || null;

        if (!barcode) {
            return { error: 'กรุณากรอกบาร์โค้ด' };
        }
        if (!name) {
            return { error: 'กรุณากรอกชื่อสินค้า' };
        }

        // Check duplicate barcode
        const existing = await db.product.findUnique({ where: { barcode } });
        if (existing) {
            return { error: `บาร์โค้ด "${barcode}" มีอยู่ในระบบแล้ว` };
        }

        await db.product.create({
            data: {
                barcode,
                code,
                name,
                size,
                price: priceStr ? parseFloat(priceStr) : 0,
                category,
                producttype,
                color,
            }
        });

        // Also create warehouse stock entry with 0
        await db.warehouseStock.create({
            data: {
                barcode,
                quantity: 0,
                reservedQuantity: 0,
            }
        });
    } catch (error) {
        console.error("Failed to create product:", error);
        return { error: 'เกิดข้อผิดพลาดในการสร้างสินค้า' };
    }

    revalidatePath('/admin/products');
    redirect('/admin/products');
}

// ============ UPDATE ============

export async function updateProduct(barcode: string, formData: FormData) {
    try {
        const code = (formData.get('code') as string)?.trim() || null;
        const name = (formData.get('name') as string)?.trim();
        const size = (formData.get('size') as string)?.trim() || null;
        const priceStr = formData.get('price') as string | null;
        const category = (formData.get('category') as string)?.trim() || null;
        const producttype = (formData.get('producttype') as string)?.trim() || null;
        const color = (formData.get('color') as string)?.trim() || null;

        if (!name) {
            return { error: 'กรุณากรอกชื่อสินค้า' };
        }

        await db.product.update({
            where: { barcode },
            data: {
                code,
                name,
                size,
                price: priceStr ? parseFloat(priceStr) : 0,
                category,
                producttype,
                color,
            }
        });
    } catch (error) {
        console.error("Failed to update product:", error);
        return { error: 'เกิดข้อผิดพลาดในการแก้ไขสินค้า' };
    }

    revalidatePath('/admin/products');
    redirect('/admin/products');
}

// ============ DELETE (Soft) ============

export async function deleteProduct(barcode: string) {
    try {
        await db.product.update({
            where: { barcode },
            data: { status: 'inactive' }
        });
    } catch (error) {
        console.error("Failed to delete product:", error);
        return { error: 'เกิดข้อผิดพลาดในการลบสินค้า' };
    }

    revalidatePath('/admin/products');
}
