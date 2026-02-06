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
    const statusOrder = ["draft", "pending_approval", "approved", "packing", "packed", "shipped", "completed"];

    // Normalize status for the stepper (e.g., 'packed' conceptually maps to the 'packing' step being done, or a separate step)
    // Let's align with the requested design: Draft -> Wait Approval -> Approved -> Packed -> Shipping -> Ready
    // If current status is 'packed', it means 'packing' step is done.

    // Let's refine the steps based on the screenshot/request implicitly
    // Screenshot shows: Draft -> Wait Approval -> Approved -> Packed -> Shipping -> Ready

    const displaySteps = [
        { id: "draft", label: "ร่าง" },
        { id: "pending_approval", label: "รออนุมัติ" },
        { id: "approved", label: "อนุมัติแล้ว" },
        { id: "packed", label: "แพคแล้ว" }, // This represents the 'packing' phase completion
        { id: "shipped", label: "กำลังส่ง" },
        { id: "completed", label: "พร้อมขาย" },
    ];

    const currentStepIndex = statusOrder.indexOf(currentStatus);

    // Helper to determine step state
    const getStepState = (stepId: string) => {
        const stepIndex = statusOrder.indexOf(stepId);

        // Special handling for 'packing' status which is between 'approved' and 'packed'
        if (currentStatus === 'packing' && stepId === 'packed') return 'current'; // Currently packing, so target is 'packed'

        if (stepIndex < currentStepIndex) return 'completed';
        if (stepIndex === currentStepIndex) return 'active';
        return 'inactive';
    };

    return (
        <div className="w-full py-4">
            <div className="relative flex items-center justify-between w-full">
                {/* Connecting Lines Filter */}
                <div className="absolute top-5 left-0 w-full h-[2px] bg-gray-200 -z-10" />

                {displaySteps.map((step, index) => {
                    const state = getStepState(step.id);
                    const isCompleted = state === 'completed';
                    const isActive = state === 'active';

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2 bg-white px-2">
                            <div
                                className={cn(
                                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                                    isCompleted ? "bg-blue-600 border-blue-600" :
                                        isActive ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
                                )}
                            >
                                {isCompleted ? (
                                    <Check className="w-6 h-6 text-white" />
                                ) : isActive ? (
                                    <Check className="w-6 h-6 text-white" />
                                ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                                )}
                            </div>
                            <span
                                className={cn(
                                    "text-xs font-medium",
                                    (isActive || isCompleted) ? "text-blue-600" : "text-gray-500"
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
