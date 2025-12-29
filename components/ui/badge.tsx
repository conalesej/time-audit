import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, type DiffStatus, diffStatusConfig } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground",
      outline: "border border-border bg-transparent text-foreground",
      match: cn(diffStatusConfig.match.bgSubtle, diffStatusConfig.match.text),
      mismatch: cn(diffStatusConfig.mismatch.bgSubtle, diffStatusConfig.mismatch.text),
      addition: cn(diffStatusConfig.addition.bgSubtle, diffStatusConfig.addition.text),
      deletion: cn(diffStatusConfig.deletion.bgSubtle, diffStatusConfig.deletion.text),
      warning: cn(diffStatusConfig.warning.bgSubtle, diffStatusConfig.warning.text),
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  showDot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, showDot = true, children, ...props }, ref) => {
    const isDiffStatus = variant && (["match", "mismatch", "addition", "deletion", "warning"] as const).includes(variant as DiffStatus);

    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, className }))}
        {...props}
      >
        {isDiffStatus && showDot && (
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              variant === "match" && diffStatusConfig.match.dot,
              variant === "mismatch" && diffStatusConfig.mismatch.dot,
              variant === "addition" && diffStatusConfig.addition.dot,
              variant === "deletion" && diffStatusConfig.deletion.dot,
              variant === "warning" && diffStatusConfig.warning.dot
            )}
          />
        )}
        {children}
      </span>
    );
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
