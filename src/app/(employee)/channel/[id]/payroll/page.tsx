import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
import { PayrollClient } from "./PayrollClient";

export default async function EmployeePayrollPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: channelId } = await params;
    const session = await getSession();
    if (!session) redirect('/login');

    // Validate channel access
    const isAdmin = ['ADMIN', 'MANAGER'].includes(session.role);
    if (!isAdmin) {
        const hasAccess = await db.channelStaff.findFirst({
            where: { channelId, staffId: session.staffId }
        });
        if (!hasAccess) notFound();
    }

    const channel = await db.salesChannel.findUnique({
        where: { id: channelId },
    });
    if (!channel) notFound();

    // Get staff info & assignment
    const staff = await db.staff.findUnique({
        where: { id: session.staffId },
        select: { dailyRate: true, commissionAmount: true },
    });

    const assignment = await db.channelStaff.findFirst({
        where: { channelId, staffId: session.staffId },
        include: {
            attachments: {
                orderBy: { createdAt: 'desc' },
            },
        },
    });

    // Count attendance
    const attendanceDays = await db.attendance.count({
        where: { channelId, staffId: session.staffId }
    });

    // Get expenses for this channel submitted by this staff
    const [expenses, expenseCategories] = await Promise.all([
        db.channelExpense.findMany({
            where: { channelId, createdBy: session.staffId },
            orderBy: { createdAt: 'desc' },
        }),
        db.expenseCategory.findMany({
            where: { isActive: true, type: 'emp' },
            orderBy: { sortOrder: 'asc' },
            select: { name: true },
        }),
    ]);

    // Calculate wage summary
    const dailyRate = Number(staff?.dailyRate || 0);
    const daysWorked = assignment?.daysWorkedOverride ?? attendanceDays;
    const commission = Number(assignment?.commissionOverride ?? staff?.commissionAmount ?? 0);
    const wageSummary = (dailyRate * daysWorked) + commission;

    const expenseData = expenses.map(e => ({
        id: e.id,
        category: e.category,
        amount: Number(e.amount),
        description: e.description,
        status: e.status,
        createdAt: e.createdAt.toISOString(),
    }));

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link
                    href={`/channel/${channelId}`}
                    className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-blue-600" />
                        เงินเดือน / ค่าใช้จ่าย
                    </h1>
                    <p className="text-xs text-slate-400">{channel.name} — {channel.code}</p>
                </div>
            </div>

            <PayrollClient
                channelId={channelId}
                staffId={session.staffId}
                categories={expenseCategories.map(c => c.name)}
                startDate={channel.startDate?.toISOString() || null}
                endDate={channel.endDate?.toISOString() || null}
                expenses={expenseData}
                wage={{
                    dailyRate,
                    daysWorked,
                    commission,
                    attendanceDays,
                    wageSummary,
                }}
                isSubmitted={assignment?.isSubmitted || false}
                submittedAt={assignment?.submittedAt?.toISOString() || null}
                isWagePaid={assignment?.isWagePaid || false}
                wagePaidAt={assignment?.wagePaidAt?.toISOString() || null}
                isCommissionPaid={assignment?.isCommissionPaid || false}
                commissionPaidAt={assignment?.commissionPaidAt?.toISOString() || null}
                attachments={(assignment?.attachments || []).map(a => ({
                    id: a.id,
                    fileName: a.fileName,
                    fileUrl: a.fileUrl,
                    fileType: a.fileType,
                    fileSize: a.fileSize,
                }))}
            />
        </div>
    );
}
