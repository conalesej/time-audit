import Papa from "papaparse";
import { parse, differenceInMinutes } from "date-fns";
import { DiffStatus } from "./utils";
import { matchEmployeeByName } from "./name-matcher";

/**
 * Timecard parsed row from Time & Attendance system
 */
export interface TimecardEntry {
  payrollName: string;
  fileNumber: string;
  payDate: string;
  timeIn: Date | null;
  timeOut: Date | null;
  hours: number;
}

/**
 * Break sheet parsed row from manual tracking
 */
export interface BreakSheetEntry {
  driverName: string;
  breakDuration: number | null;
  breakTimeRange: {
    start: Date | null;
    end: Date | null;
    actualMinutes: number | null;
  } | null;
  hasRemarks: boolean;
}

/**
 * Detected gap in timecard (potential break)
 */
export interface TimecardGap {
  employeeName: string;
  fileNumber: string;
  gapStart: Date;
  gapEnd: Date;
  gapMinutes: number;
}

/**
 * Comparison result for a single employee
 */
export interface EmployeeComparisonResult {
  employeeName: string;
  fileNumber: string;
  matchedBreakSheetName: string | null;
  matchScore: number;

  // Timecard data
  timecardGap: TimecardGap | null;
  totalShiftHours: number;

  // Break sheet data
  breakSheetDuration: number | null;
  breakSheetTimeRange: {
    start: Date | null;
    end: Date | null;
    actualMinutes: number | null;
  } | null;

  // Comparison result
  status: DiffStatus;
  discrepancyMinutes: number | null;
  message: string;
}

/**
 * Full comparison report
 */
export interface DiscrepancyReport {
  targetDate: string;
  generatedAt: Date;

  // Summary counts
  summary: {
    totalEmployees: number;
    matches: number;
    mismatches: number;
    missingBreakLog: number;
    missingGap: number;
    noBreakRequired: number;
  };

  // Individual results
  results: EmployeeComparisonResult[];
}

/**
 * Parse time string in "HH:MM AM/PM" format
 * Handles both 12-hour formats with or without space before AM/PM
 */
function parseTimeString(timeStr: string, referenceDate = new Date()): Date | null {
  if (!timeStr || timeStr.trim() === "") return null;

  try {
    // Try format with space: "09:50 AM"
    let parsed = parse(timeStr, "hh:mm a", referenceDate);
    if (!isNaN(parsed.getTime())) return parsed;

    // Try format without space: "9:50am"
    parsed = parse(timeStr, "h:mma", referenceDate);
    if (!isNaN(parsed.getTime())) return parsed;

    // Try uppercase without space: "9:50AM"
    parsed = parse(timeStr, "h:mmaa", referenceDate);
    if (!isNaN(parsed.getTime())) return parsed;

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse break duration text to minutes
 * Handles: "30 minutes", "15 minutes", "30 and 15", "2nd 15 minutes"
 */
function parseBreakDuration(text: string): number | null {
  if (!text || text.trim() === "") return null;

  // Handle "30 and 15" → 45 minutes
  if (text.includes("30 and 15")) return 45;

  // Extract first number followed by "minutes" or "mins"
  const match = text.match(/(\d+)\s*(minutes?|mins?)/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Parse time range string like "12:45pm - 1:13pm (28m)"
 * Returns start, end times and actual duration
 */
function parseTimeRange(rangeStr: string, referenceDate = new Date()): {
  start: Date | null;
  end: Date | null;
  actualMinutes: number | null;
} | null {
  if (!rangeStr || rangeStr.trim() === "") return null;

  try {
    // Extract time range pattern: "12:45pm - 1:13pm" and duration "(28m)"
    const rangeMatch = rangeStr.match(/(\d{1,2}:\d{2}[ap]m)\s*-\s*(\d{1,2}:\d{2}[ap]m)/i);
    const durationMatch = rangeStr.match(/\((\d+)m\)/);

    if (!rangeMatch) return null;

    const start = parseTimeString(rangeMatch[1], referenceDate);
    const end = parseTimeString(rangeMatch[2], referenceDate);
    const actualMinutes = durationMatch ? parseInt(durationMatch[1], 10) : null;

    return { start, end, actualMinutes };
  } catch {
    return null;
  }
}

/**
 * Parse Timecard CSV file
 * Format: "Company Code","Payroll Name","File Number","Pay Date","Time In","Time Out","Hours","Earnings Code","Worked Department"
 */
export function parseTimecardCSV(file: File): Promise<TimecardEntry[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        const entries: TimecardEntry[] = [];

        for (const row of results.data) {
          // Skip rows with missing critical data
          if (!row["Payroll Name"] || !row["File Number"] || !row["Pay Date"]) {
            continue;
          }

          // Skip rows where both Time In and Time Out are empty
          if (!row["Time In"] && !row["Time Out"]) {
            continue;
          }

          const timeIn = parseTimeString(row["Time In"]);
          const timeOut = parseTimeString(row["Time Out"]);

          entries.push({
            payrollName: row["Payroll Name"].trim(),
            fileNumber: row["File Number"].trim(),
            payDate: row["Pay Date"].trim(),
            timeIn,
            timeOut,
            hours: parseFloat(row["Hours"]) || 0,
          });
        }

        resolve(entries);
      },
      error: (error) => {
        reject(new Error(`Failed to parse timecard CSV: ${error.message}`));
      },
    });
  });
}

/**
 * Parse Break Sheet CSV file
 * Format: First row is date, second row is headers, data starts at row 3
 * Columns: Drivers,Break,,Remarks,,30mns break
 */
export function parseBreakSheetCSV(file: File): Promise<BreakSheetEntry[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const entries: BreakSheetEntry[] = [];

        // Skip first 2 rows (date and headers)
        const dataRows = results.data.slice(2);

        for (const row of dataRows) {
          // Column 0: Driver name
          // Column 1: Break duration text
          // Column 3: Remarks
          // Column 5: Time range

          const driverName = row[0]?.trim() || "";
          if (!driverName) continue; // Skip rows without driver name

          const breakDuration = parseBreakDuration(row[1] || "");
          const hasRemarks = (row[3]?.trim() || "") !== "";
          const timeRangeStr = row[5]?.trim() || "";
          const breakTimeRange = parseTimeRange(timeRangeStr);

          entries.push({
            driverName,
            breakDuration,
            breakTimeRange,
            hasRemarks,
          });
        }

        resolve(entries);
      },
      error: (error) => {
        reject(new Error(`Failed to parse break sheet CSV: ${error.message}`));
      },
    });
  });
}

/**
 * Detect gaps between clock-out and next clock-in for an employee
 * Returns gaps longer than 10 minutes (potential breaks)
 */
export function detectTimecardGaps(
  entries: TimecardEntry[],
  targetDate: string
): TimecardGap[] {
  const gaps: TimecardGap[] = [];

  // Filter by target date
  const dateEntries = entries.filter((e) => e.payDate === targetDate);

  // Group by employee (file number)
  const employeeMap = new Map<string, TimecardEntry[]>();
  for (const entry of dateEntries) {
    const existing = employeeMap.get(entry.fileNumber) || [];
    existing.push(entry);
    employeeMap.set(entry.fileNumber, existing);
  }

  // For each employee, detect gaps
  for (const [fileNumber, employeeEntries] of employeeMap) {
    // Sort by time in
    const sorted = employeeEntries
      .filter((e) => e.timeIn !== null)
      .sort((a, b) => a.timeIn!.getTime() - b.timeIn!.getTime());

    // Find gaps between consecutive entries
    for (let i = 0; i < sorted.length - 1; i++) {
      const currentEntry = sorted[i];
      const nextEntry = sorted[i + 1];

      // Skip if current entry has no time out
      if (!currentEntry.timeOut || !nextEntry.timeIn) continue;

      const gapMinutes = differenceInMinutes(nextEntry.timeIn, currentEntry.timeOut);

      // Only include gaps > 10 minutes
      if (gapMinutes > 10) {
        gaps.push({
          employeeName: currentEntry.payrollName,
          fileNumber,
          gapStart: currentEntry.timeOut,
          gapEnd: nextEntry.timeIn,
          gapMinutes,
        });
      }
    }
  }

  return gaps;
}

/**
 * Compare a timecard gap with break sheet entry
 * @param gap - Detected gap from timecard
 * @param breakEntry - Matched break sheet entry (or null)
 * @param toleranceMinutes - Acceptable difference (default: 5)
 * @returns DiffStatus and discrepancy details
 */
export function compareBreakRecords(
  gap: TimecardGap | null,
  breakEntry: BreakSheetEntry | null,
  toleranceMinutes = 5
): { status: DiffStatus; discrepancyMinutes: number | null; message: string } {
  // Case 1: Both gap and break entry exist - compare durations
  if (gap && breakEntry) {
    const gapMinutes = gap.gapMinutes;

    // Use actual break time range if available, otherwise use declared duration
    const loggedMinutes =
      breakEntry.breakTimeRange?.actualMinutes ?? breakEntry.breakDuration;

    if (loggedMinutes === null) {
      // Break entry exists but no duration specified
      return {
        status: "warning",
        discrepancyMinutes: null,
        message: `Gap detected (${gapMinutes}min) but break duration not specified in sheet`,
      };
    }

    const difference = Math.abs(gapMinutes - loggedMinutes);

    if (difference <= toleranceMinutes) {
      return {
        status: "match",
        discrepancyMinutes: 0,
        message: `Break properly logged (Gap: ${gapMinutes}min, Logged: ${loggedMinutes}min)`,
      };
    } else {
      return {
        status: "mismatch",
        discrepancyMinutes: gapMinutes - loggedMinutes,
        message: `Duration mismatch (Gap: ${gapMinutes}min, Logged: ${loggedMinutes}min, Difference: ${difference}min)`,
      };
    }
  }

  // Case 2: Gap exists but no break entry - missing break log
  if (gap && !breakEntry) {
    return {
      status: "deletion",
      discrepancyMinutes: gap.gapMinutes,
      message: `Gap detected (${gap.gapMinutes}min) but no break logged in sheet`,
    };
  }

  // Case 3: Break entry exists but no gap - break logged but not clocked
  if (!gap && breakEntry) {
    const loggedMinutes =
      breakEntry.breakTimeRange?.actualMinutes ?? breakEntry.breakDuration;
    return {
      status: "warning",
      discrepancyMinutes: loggedMinutes ? -loggedMinutes : null,
      message: `Break logged (${loggedMinutes}min) but no gap found in timecard`,
    };
  }

  // Case 4: Neither gap nor break entry - should not happen in normal flow
  return {
    status: "match",
    discrepancyMinutes: null,
    message: "No break required",
  };
}

/**
 * Generate full comparison report
 * @param timecardEntries - Parsed timecard entries
 * @param breakSheetEntries - Parsed break sheet entries
 * @param targetDate - Date to compare (e.g., "12/24/2025")
 * @param toleranceMinutes - Acceptable difference (default: 5)
 */
export function generateDiscrepancyReport(
  timecardEntries: TimecardEntry[],
  breakSheetEntries: BreakSheetEntry[],
  targetDate: string,
  toleranceMinutes = 5
): DiscrepancyReport {
  // Detect all gaps in timecard for target date
  const gaps = detectTimecardGaps(timecardEntries, targetDate);

  // Get unique employees from timecard for target date
  const dateEntries = timecardEntries.filter((e) => e.payDate === targetDate);
  const employeeMap = new Map<string, TimecardEntry[]>();

  for (const entry of dateEntries) {
    const existing = employeeMap.get(entry.fileNumber) || [];
    existing.push(entry);
    employeeMap.set(entry.fileNumber, existing);
  }

  // Prepare break sheet names for matching
  const breakSheetNames = breakSheetEntries.map((e) => e.driverName);

  // Build results for each employee
  const results: EmployeeComparisonResult[] = [];

  for (const [fileNumber, entries] of employeeMap) {
    const employeeName = entries[0].payrollName;
    const totalShiftHours = entries.reduce((sum, e) => sum + e.hours, 0);

    // Find gap for this employee
    const employeeGap = gaps.find((g) => g.fileNumber === fileNumber) || null;

    // Match employee name to break sheet
    const nameMatch = matchEmployeeByName(employeeName, breakSheetNames);

    // Find break sheet entry if matched
    let breakEntry: BreakSheetEntry | null = null;
    if (nameMatch.match) {
      breakEntry =
        breakSheetEntries.find((e) => e.driverName === nameMatch.match) || null;
    }

    // Compare gap with break entry
    const comparison = compareBreakRecords(employeeGap, breakEntry, toleranceMinutes);

    results.push({
      employeeName,
      fileNumber,
      matchedBreakSheetName: nameMatch.match,
      matchScore: nameMatch.score,
      timecardGap: employeeGap,
      totalShiftHours,
      breakSheetDuration: breakEntry?.breakDuration || null,
      breakSheetTimeRange: breakEntry?.breakTimeRange || null,
      status: comparison.status,
      discrepancyMinutes: comparison.discrepancyMinutes,
      message: comparison.message,
    });
  }

  // Calculate summary statistics
  const summary = {
    totalEmployees: results.length,
    matches: results.filter((r) => r.status === "match").length,
    mismatches: results.filter((r) => r.status === "mismatch").length,
    missingBreakLog: results.filter((r) => r.status === "deletion").length,
    missingGap: results.filter((r) => r.status === "warning").length,
    noBreakRequired: results.filter((r) => r.status === "addition").length,
  };

  return {
    targetDate,
    generatedAt: new Date(),
    summary,
    results,
  };
}
