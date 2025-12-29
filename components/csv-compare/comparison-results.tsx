import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn, diffStatusConfig } from "@/lib/utils";
import type { EmployeeComparisonResult } from "@/lib/csv-utils";
import { format } from "date-fns";
import { Check, X } from "lucide-react";

interface ComparisonResultsProps {
  results: EmployeeComparisonResult[];
}

export function ComparisonResults({ results }: ComparisonResultsProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead className="sticky top-0 bg-background z-10">
          <tr className="border-b-2 border-border/60">
            <th className="px-4 py-3 text-left font-semibold text-foreground">Employee</th>
            <th className="px-3 py-3 text-left font-semibold text-foreground">Clock IN</th>
            <th className="px-3 py-3 text-left font-semibold text-foreground">Clock OUT</th>
            <th className="px-3 py-3 text-left font-semibold text-foreground">Break Time</th>
            <th className="px-3 py-3 text-center font-semibold text-foreground">Duration</th>
            <th className="px-3 py-3 text-center font-semibold text-foreground text-xs">
              <div className="flex flex-col items-center gap-0.5">
                <span>Lunch</span>
                <span className="text-[10px] text-muted-foreground font-normal">(30min)</span>
              </div>
            </th>
            <th className="px-3 py-3 text-left font-semibold text-foreground">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">Notes</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => {
            const breakTaken = Boolean(result.breakSheetDuration);
            const lunchBreak = result.breakSheetDuration && result.breakSheetDuration >= 30;
            const breakTimeDisplay = result.breakSheetTimeRange?.start && result.breakSheetTimeRange?.end
              ? `${format(result.breakSheetTimeRange.start, "HH:mm")} - ${format(result.breakSheetTimeRange.end, "HH:mm")}`
              : "-";

            return (
              <tr
                key={result.fileNumber}
                className={cn(
                  "group transition-all duration-200 border-b border-border/40",
                  "hover:shadow-sm hover:relative hover:z-[1]",
                  diffStatusConfig[result.status].bgSubtle,
                  index % 2 === 0 && "bg-muted/20"
                )}
              >
                {/* Employee Name */}
                <td className="px-4 py-3.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground tracking-tight">
                      {result.employeeName}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      #{result.fileNumber}
                    </span>
                  </div>
                </td>

                {/* Clock IN */}
                <td className="px-3 py-3.5">
                  <div className="font-mono text-sm font-medium tabular-nums">
                    {result.firstClockIn ? (
                      <span className="text-foreground">{format(result.firstClockIn, "HH:mm")}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </td>

                {/* Clock OUT */}
                <td className="px-3 py-3.5">
                  <div className="font-mono text-sm font-medium tabular-nums">
                    {result.lastClockOut ? (
                      <span className="text-foreground">{format(result.lastClockOut, "HH:mm")}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </td>

                {/* Break Time Range */}
                <td className="px-3 py-3.5">
                  <div className="font-mono text-xs font-medium tabular-nums text-muted-foreground">
                    {breakTimeDisplay}
                  </div>
                </td>

                {/* Break Duration */}
                <td className="px-3 py-3.5">
                  <div className="flex items-center justify-center">
                    {breakTaken ? (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/20">
                        <span className="font-mono text-xs font-semibold text-primary tabular-nums">
                          {result.breakSheetDuration}
                        </span>
                        <span className="text-[10px] text-primary/70">min</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </td>

                {/* Lunch Break Indicator */}
                <td className="px-3 py-3.5">
                  <div className="flex items-center justify-center">
                    {lunchBreak ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/15 ring-1 ring-green-500/30">
                        <Check className="h-3.5 w-3.5 text-green-600 stroke-[2.5]" />
                      </div>
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/40">
                        <X className="h-3 w-3 text-muted-foreground/50 stroke-[2]" />
                      </div>
                    )}
                  </div>
                </td>

                {/* Status Badge */}
                <td className="px-3 py-3.5">
                  <Badge variant={result.status} className="font-medium">
                    {result.status}
                  </Badge>
                </td>

                {/* Message/Notes */}
                <td className="px-4 py-3.5">
                  <div className="text-xs text-muted-foreground leading-relaxed max-w-md">
                    {result.message}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
