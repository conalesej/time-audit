import * as fuzzball from "fuzzball";

/**
 * Result of fuzzy name matching
 */
export interface NameMatchResult {
  match: string | null;
  score: number;
}

/**
 * Normalize employee name for comparison
 * Handles different formats:
 * - "Last, First" → "first last"
 * - "Last, First Middle" → "first middle last"
 * - "First,Last" → "first last"
 * - "First Last" → "first last"
 *
 * Returns lowercase, tokenized, alphabetically sorted
 */
export function normalizeEmployeeName(name: string): string {
  if (!name) return "";

  // Remove extra whitespace and quotes
  let cleaned = name.trim().replace(/"/g, "");

  // Split on comma to detect "Last, First" or "First,Last" formats
  const parts = cleaned.split(",").map((part) => part.trim());

  let tokens: string[];

  if (parts.length > 1) {
    // Has comma: "Last, First" or "First,Last"
    // Flatten all parts and split on whitespace
    tokens = parts.flatMap((part) => part.split(/\s+/));
  } else {
    // No comma: "First Last" or single name
    tokens = cleaned.split(/\s+/);
  }

  // Remove empty tokens, lowercase, remove punctuation
  const normalizedTokens = tokens
    .filter((token) => token.length > 0)
    .map((token) => token.toLowerCase().replace(/[^\w]/g, ""));

  // Sort alphabetically for consistent comparison
  // This makes "Acosta Geovanny" match "Geovanny Acosta"
  return normalizedTokens.sort().join(" ");
}

/**
 * Find best fuzzy match for an employee name from a list
 * Uses token_sort_ratio for order-independent matching
 *
 * @param timecardName - Name from timecard (e.g., "Acosta, Geovanny")
 * @param breakSheetNames - Names from break sheet (e.g., ["Geovanny,Acosta", ...])
 * @param threshold - Minimum score to consider a match (default: 80)
 * @returns Best match and score, or null if no match above threshold
 */
export function matchEmployeeByName(
  timecardName: string,
  breakSheetNames: string[],
  threshold = 80
): NameMatchResult {
  const normalized = normalizeEmployeeName(timecardName);

  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const breakSheetName of breakSheetNames) {
    const targetNormalized = normalizeEmployeeName(breakSheetName);

    // Use token_sort_ratio for order-independent fuzzy matching
    const score = fuzzball.token_sort_ratio(normalized, targetNormalized);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = breakSheetName;
    }
  }

  // Return match only if above threshold
  if (bestScore >= threshold) {
    return { match: bestMatch, score: bestScore };
  }

  return { match: null, score: bestScore };
}

/**
 * Batch match timecard names to break sheet names
 * Returns a map of timecard name to best break sheet match
 */
export function batchMatchEmployees(
  timecardNames: string[],
  breakSheetNames: string[],
  threshold = 80
): Map<string, NameMatchResult> {
  const matchMap = new Map<string, NameMatchResult>();

  for (const timecardName of timecardNames) {
    const result = matchEmployeeByName(timecardName, breakSheetNames, threshold);
    matchMap.set(timecardName, result);
  }

  return matchMap;
}
