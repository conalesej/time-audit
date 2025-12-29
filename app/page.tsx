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
import { format } from "date-fns";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, FileText, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

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

  // Sanitize CSV fields to prevent CSV injection attacks
  function sanitizeCSVField(field: string | null | undefined): string {
    if (!field) return "";
    const str = String(field);
    // Prefix dangerous characters with single quote to prevent formula execution
    if (/^[=+\-@|%]/.test(str)) {
      return `'${str}`;
    }
    return str;
  }

  function exportAllEntries(): void {
    if (!report) return;

    try {
      const data = report.results.map((result) => ({
        Name: sanitizeCSVField(result.employeeName),
        "Clock IN": result.firstClockIn ? format(result.firstClockIn, "HH:mm") : "",
        "Clock Out": result.lastClockOut ? format(result.lastClockOut, "HH:mm") : "",
        "Station Clock OUT": "",
        Notes: "", // Empty field for manual notes during review
      }));

      const csv = Papa.unparse(data, { quotes: true, header: true });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = `timecard-all-${report.targetDate.replace(/\//g, "-")}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export failed:", error);
      setError(`Failed to export: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  function exportDiscrepancies(): void {
    if (!report) return;

    try {
      const data = report.results.map((result) => ({
        Name: sanitizeCSVField(result.employeeName),
        "Clock IN": result.firstClockIn ? format(result.firstClockIn, "HH:mm") : "",
        "Clock Out": result.lastClockOut ? format(result.lastClockOut, "HH:mm") : "",
        "Station Clock OUT": "",
        Notes: [
          sanitizeCSVField(result.message),
          result.breakRemarks ? `Remarks: ${sanitizeCSVField(result.breakRemarks)}` : null,
          result.timecardGap
            ? `Gap: ${result.timecardGap.gapMinutes}min, Logged: ${result.breakSheetDuration ?? "N/A"}min`
            : null,
        ]
          .filter(Boolean)
          .join(" | "),
      }));

      const csv = Papa.unparse(data, { quotes: true, header: true });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = `timecard-discrepancies-${report.targetDate.replace(/\//g, "-")}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export failed:", error);
      setError(`Failed to export: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  function exportToExcel(): void {
    if (!report) return;

    try {
      const workbook = XLSX.utils.book_new();

      // Prepare data for Excel sheet
      const sheetData = report.results.map((result) => ({
        Name: result.employeeName,
        "Clock IN": result.firstClockIn ? format(result.firstClockIn, "HH:mm") : "",
        "Clock Out": result.lastClockOut ? format(result.lastClockOut, "HH:mm") : "",
        "Station Clock OUT": "",
        "Break Taken": result.breakSheetDuration ? "Yes" : "No",
        "Break Duration": result.breakSheetDuration ? `${result.breakSheetDuration} mins` : "",
        "Break Time": result.breakSheetTimeRange?.start && result.breakSheetTimeRange?.end
          ? `${format(result.breakSheetTimeRange.start, "HH:mm")} - ${format(result.breakSheetTimeRange.end, "HH:mm")}`
          : "",
        "Lunch Break (30min)": result.breakSheetDuration && result.breakSheetDuration >= 30 ? "Yes" : "No",
        Notes: "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(sheetData);

      // Format date for sheet name (e.g., "12-24-2025")
      const sheetName = report.targetDate.replace(/\//g, "-");
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Generate and download
      XLSX.writeFile(workbook, `timecard-${sheetName}.xlsx`);
    } catch (error) {
      console.error("Export failed:", error);
      setError(`Failed to export: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Time Sheet Break Audit
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Compare timecard and break sheet CSVs to identify discrepancies
            </p>
          </div>
          <ThemeToggle />
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Export CSV
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72">
                      <DropdownMenuItem onClick={exportAllEntries} className="flex-col items-start gap-1 p-3">
                        <div className="flex items-center gap-2 w-full">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">Export All Entries</span>
                        </div>
                        <span className="text-xs text-muted-foreground pl-6">
                          All timecard entries as CSV
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportDiscrepancies} className="flex-col items-start gap-1 p-3">
                        <div className="flex items-center gap-2 w-full">
                          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">Export Discrepancies</span>
                        </div>
                        <span className="text-xs text-muted-foreground pl-6">
                          Only items with issues as CSV
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportToExcel} className="flex-col items-start gap-1 p-3">
                        <div className="flex items-center gap-2 w-full">
                          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">Export to Excel</span>
                        </div>
                        <span className="text-xs text-muted-foreground pl-6">
                          Full report with break details
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
