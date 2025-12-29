import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn, diffStatusConfig } from "@/lib/utils";
import type { EmployeeComparisonResult } from "@/lib/csv-utils";

interface ComparisonResultsProps {
  results: EmployeeComparisonResult[];
}

export function ComparisonResults({ results }: ComparisonResultsProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="p-3">Employee</th>
            <th className="p-3">Gap (min)</th>
            <th className="p-3">Logged (min)</th>
            <th className="p-3">Status</th>
            <th className="p-3">Message</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr
              key={result.fileNumber}
              className={cn(
                "border-b border-border transition-colors hover:bg-muted/50",
                diffStatusConfig[result.status].bgSubtle
              )}
            >
              <td className="p-3 font-medium">{result.employeeName}</td>
              <td className="p-3 font-mono">
                {result.timecardGap?.gapMinutes ?? "-"}
              </td>
              <td className="p-3 font-mono">
                {result.breakSheetDuration ?? "-"}
              </td>
              <td className="p-3">
                <Badge variant={result.status}>{result.status}</Badge>
              </td>
              <td className="p-3 text-muted-foreground">{result.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
