"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Get all expense categories, ordered by sortOrder
 * @param activeOnly If true, returns only categories with isActive = true
 */
export async function getExpenseCategories(activeOnly: boolean = false) {
    try {
        const categories = await db.expenseCategory.findMany({
            where: activeOnly ? { isActive: true } : undefined,
            orderBy: [
                { sortOrder: "asc" },
                { name: "asc" }
            ],
        });
        return { success: true, data: categories };
    } catch (error) {
        console.error("Failed to fetch expense categories:", error);
        return { success: false, error: "ไม่สามารถดึงข้อมูลหมวดหมู่ค่าใช้จ่ายได้" };
    }
}

/**
 * Create a new expense category
 */
export async function createExpenseCategory(formData: FormData) {
    try {
        const name = (formData.get("name") as string)?.trim();
        const type = (formData.get("type") as string) || "emp";
        const whtType = (formData.get("whtType") as string) || "none";
        const sortOrderStr = formData.get("sortOrder") as string;

        if (!name) {
            return { error: "กรุณาระบุชื่อหมวดหมู่ค่าใช้จ่าย" };
        }

        const sortOrder = parseInt(sortOrderStr) || 0;

        // Check for duplicates
        const existing = await db.expenseCategory.findUnique({
            where: { name },
        });

        if (existing) {
            return { error: "มีหมวดหมู่นี้ในระบบแล้ว" };
        }

        await db.expenseCategory.create({
            data: {
                name,
                type,
                whtType,
                sortOrder,
                isActive: true,
            },
        });

        revalidatePath("/admin/expense-categories");
        revalidatePath("/hr/payroll");
        revalidatePath("/channels");

        return { success: true };
    } catch (error) {
        console.error("Failed to create expense category:", error);
        return { error: "เกิดข้อผิดพลาดในการสร้างหมวดหมู่ค่าใช้จ่าย" };
    }
}

/**
 * Update an existing expense category
 */
export async function updateExpenseCategory(id: string, formData: FormData) {
    try {
        const name = (formData.get("name") as string)?.trim();
        const type = (formData.get("type") as string) || "emp";
        const whtType = (formData.get("whtType") as string) || "none";
        const sortOrderStr = formData.get("sortOrder") as string;

        if (!name) {
            return { error: "กรุณาระบุชื่อหมวดหมู่ค่าใช้จ่าย" };
        }

        const sortOrder = parseInt(sortOrderStr) || 0;

        // Check for duplicates with different ID
        const existing = await db.expenseCategory.findFirst({
            where: {
                name,
                id: { not: id }
            },
        });

        if (existing) {
            return { error: "มีหมวดหมู่นี้ในระบบแล้ว" };
        }

        await db.expenseCategory.update({
            where: { id },
            data: {
                name,
                type,
                whtType,
                sortOrder,
            },
        });

        revalidatePath("/admin/expense-categories");
        revalidatePath("/hr/payroll");
        revalidatePath("/channels");

        return { success: true };
    } catch (error) {
        console.error("Failed to update expense category:", error);
        return { error: "เกิดข้อผิดพลาดในการแก้ไขหมวดหมู่ค่าใช้จ่าย" };
    }
}

/**
 * Toggle category active status (soft delete)
 */
export async function toggleExpenseCategoryStatus(id: string, isActive: boolean) {
    try {
        await db.expenseCategory.update({
            where: { id },
            data: { isActive },
        });

        revalidatePath("/admin/expense-categories");
        revalidatePath("/hr/payroll");
        revalidatePath("/channels");

        return { success: true };
    } catch (error) {
        console.error("Failed to toggle expense category status:", error);
        return { error: "เกิดข้อผิดพลาดในการเปลี่ยนสถานะหมวดหมู่ค่าใช้จ่าย" };
    }
}
