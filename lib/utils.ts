import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines clsx and tailwind-merge to safely compose Tailwind classes
 * Handles conditional classes and prevents conflicting Tailwind utilities
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Semantic status for CSV diff comparison
 */
export type DiffStatus = "match" | "mismatch" | "addition" | "deletion" | "warning";

/**
 * Configuration for diff status visual styling
 * Maps each status to Tailwind CSS class names
 */
export const diffStatusConfig: Record<
  DiffStatus,
  {
    bg: string;
    bgSubtle: string;
    text: string;
    border: string;
    dot: string;
    label: string;
  }
> = {
  match: {
    bg: "bg-match",
    bgSubtle: "bg-match-subtle",
    text: "text-match-foreground",
    border: "border-match",
    dot: "bg-match",
    label: "Match",
  },
  mismatch: {
    bg: "bg-mismatch",
    bgSubtle: "bg-mismatch-subtle",
    text: "text-mismatch-foreground",
    border: "border-mismatch",
    dot: "bg-mismatch",
    label: "Mismatch",
  },
  addition: {
    bg: "bg-addition",
    bgSubtle: "bg-addition-subtle",
    text: "text-addition-foreground",
    border: "border-addition",
    dot: "bg-addition",
    label: "Added",
  },
  deletion: {
    bg: "bg-deletion",
    bgSubtle: "bg-deletion-subtle",
    text: "text-deletion-foreground",
    border: "border-deletion",
    dot: "bg-deletion",
    label: "Removed",
  },
  warning: {
    bg: "bg-warning",
    bgSubtle: "bg-warning-subtle",
    text: "text-warning-foreground",
    border: "border-warning",
    dot: "bg-warning",
    label: "Warning",
  },
};
