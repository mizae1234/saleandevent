import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventStatusStepperProps {
    currentStatus: string;
}

const steps = [
    { id: "draft", label: "ร่าง" },
    { id: "pending_approval", label: "รออนุมัติ" },
    { id: "approved", label: "อนุมัติแล้ว" },
    { id: "packing", label: "แพคแล้ว" }, // Logic note: 'packing' usually means in progress, but for stepper visualization we might want to show it as a distinct step.
    { id: "shipped", label: "กำลังส่ง" },
    { id: "completed", label: "พร้อมขาย" },
];

export function EventStatusStepper({ currentStatus }: EventStatusStepperProps) {
    // Map status to index
    // Full lifecycle: Draft -> Pending -> Approved -> Packing -> Packed -> Shipped -> Active -> Pending Return -> Returning -> Returned -> Completed
    const statusOrder = [
        "draft",
        "pending_approval",
        "approved",
        "packing",
        "packed",
        "shipped",
        "active",
        "pending_return",
        "returning",
        "returned",
        "completed"
    ];

    const displaySteps = [
        { id: "draft", label: "ร่าง" },
        { id: "pending_approval", label: "รออนุมัติ" },
        { id: "packed", label: "แพคของ" },
        { id: "shipped", label: "ส่งของ" },
        { id: "active", label: "กำลังขาย" },
        { id: "returning", label: "ส่งคืน" },
        { id: "returned", label: "คืนครบ" },
        { id: "completed", label: "จบงาน" },
    ];

    const currentStepIndex = statusOrder.indexOf(currentStatus);

    // Helper to determine step state
    const getStepState = (stepId: string) => {
        // Map stepId to representative status index in statusOrder
        let stepOrderIndex = statusOrder.indexOf(stepId);

        // Adjust for intermediate steps
        if (stepId === 'packed') {
            // If current is 'packing', we are ON this step (active)
            if (currentStatus === 'packing') return 'active';
            // If current is 'approved', we are waiting for this (inactive)
            if (currentStatus === 'approved') return 'inactive';
        }

        if (stepId === 'returning') {
            if (currentStatus === 'pending_return') return 'active';
        }

        if (stepOrderIndex < currentStepIndex) return 'completed';
        if (stepOrderIndex === currentStepIndex) return 'active';
        return 'inactive';
    };

    return (
        <div className="w-full py-4 overflow-x-auto">
            <div className="min-w-[800px] relative flex items-center justify-between px-4">
                {/* Connecting Line */}
                <div className="absolute top-5 left-0 w-full h-[2px] bg-slate-100 -z-10" />

                {displaySteps.map((step, index) => {
                    const state = getStepState(step.id);
                    const isCompleted = state === 'completed';
                    const isActive = state === 'active';

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2 bg-white px-2">
                            <div
                                className={cn(
                                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                                    isCompleted
                                        ? "bg-emerald-600 border-emerald-600 shadow-md"
                                        : isActive
                                            ? "bg-white border-teal-600 shadow-lg ring-4 ring-teal-50"
                                            : "bg-white border-slate-200"
                                )}
                            >
                                {isCompleted ? (
                                    <Check className="w-5 h-5 text-white" />
                                ) : isActive ? (
                                    <div className="w-3 h-3 rounded-full bg-teal-600 animate-pulse" />
                                ) : (
                                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                                )}
                            </div>
                            <span
                                className={cn(
                                    "text-xs font-medium transition-colors duration-200",
                                    isCompleted ? "text-emerald-700" :
                                        isActive ? "text-teal-700 font-bold" : "text-slate-400"
                                )}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
