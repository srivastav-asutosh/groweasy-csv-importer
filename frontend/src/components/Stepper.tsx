import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Upload", "Preview", "Confirm & Process", "Results"] as const;

export function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <ol className="flex w-full items-center">
      {STEPS.map((label, index) => {
        const stepNumber = index + 1;
        const isComplete = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isComplete && "bg-indigo-600 text-white",
                  isCurrent && "bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-500/20",
                  !isComplete && !isCurrent && "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                )}
              >
                {isComplete ? <Check size={14} /> : stepNumber}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:block",
                  isCurrent ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400"
                )}
              >
                {label}
              </span>
            </div>
            {stepNumber !== STEPS.length && (
              <div
                className={cn(
                  "mx-2 h-0.5 flex-1 rounded",
                  isComplete ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
