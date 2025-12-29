import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DiscrepancyReport } from "@/lib/csv-utils";

interface SummaryStatsProps {
  summary: DiscrepancyReport["summary"];
}

export function SummaryStats({ summary }: SummaryStatsProps) {
  const stats = [
    {
      label: "Total",
      value: summary.totalEmployees,
      variant: "default" as const,
    },
    {
      label: "Matches",
      value: summary.matches,
      variant: "match" as const,
    },
    {
      label: "Mismatches",
      value: summary.mismatches,
      variant: "mismatch" as const,
    },
    {
      label: "Missing Logs",
      value: summary.missingBreakLog,
      variant: "deletion" as const,
    },
    {
      label: "Missing Gaps",
      value: summary.missingGap,
      variant: "warning" as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold">{stat.value}</p>
            <Badge variant={stat.variant} className="mt-2">
              {stat.label}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
