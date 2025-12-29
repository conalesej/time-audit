"use client";

import * as React from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryStats, ComparisonResults } from "@/components/csv-compare";
import {
  parseTimecardCSV,
  parseBreakSheetCSV,
  generateDiscrepancyReport,
  type DiscrepancyReport,
} from "@/lib/csv-utils";

export default function Home() {
  const [timecardFile, setTimecardFile] = React.useState<File | null>(null);
  const [breakSheetFile, setBreakSheetFile] = React.useState<File | null>(null);
  const [report, setReport] = React.useState<DiscrepancyReport | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const canCompare = timecardFile !== null && breakSheetFile !== null;

  async function handleCompare() {
    if (!timecardFile || !breakSheetFile) return;

    setLoading(true);
    setError(null);

    try {
      const timecardEntries = await parseTimecardCSV(timecardFile);
      const breakSheetEntries = await parseBreakSheetCSV(breakSheetFile);
      const comparisonReport = generateDiscrepancyReport(
        timecardEntries,
        breakSheetEntries,
        "12/24/2025"
      );
      setReport(comparisonReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }

  function exportToCSV() {
    if (!report) return;

    const headers = [
      "Employee",
      "File Number",
      "Gap (min)",
      "Logged (min)",
      "Status",
      "Message",
    ];
    const rows = report.results.map((r) => [
      r.employeeName,
      r.fileNumber,
      r.timecardGap?.gapMinutes ?? "",
      r.breakSheetDuration ?? "",
      r.status,
      r.message,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `discrepancy-report-${report.targetDate.replace(/\//g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <header>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Time Sheet Break Audit
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Compare timecard and break sheet CSVs to identify discrepancies
          </p>
        </header>

        {/* File Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FileUpload
                label="Timecard CSV"
                description="Time & Attendance system export"
                onChange={setTimecardFile}
              />
              <FileUpload
                label="Break Sheet CSV"
                description="Manual break tracking sheet"
                onChange={setBreakSheetFile}
              />
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleCompare}
                disabled={!canCompare || loading}
                size="lg"
              >
                {loading ? "Analyzing..." : "Compare Files"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 p-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>Analyzing files...</span>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-mismatch bg-mismatch-subtle">
            <CardContent className="p-4 text-mismatch-foreground">
              <strong>Error:</strong> {error}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {report && !loading && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div>
              <h2 className="mb-4 text-2xl font-semibold">Summary</h2>
              <SummaryStats summary={report.summary} />
            </div>

            {/* Results Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Comparison Results</CardTitle>
                  <Button onClick={exportToCSV} variant="outline" size="sm">
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ComparisonResults results={report.results} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
