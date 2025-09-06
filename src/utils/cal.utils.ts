import {
  formatInTimeZone,
  getTimezoneOffset as getTzOffset,
  toZonedTime,
} from "date-fns-tz";
import { format } from "date-fns";
import { AvailabilityData } from "../types/cal.types";

interface CompactSlot {
  start: string;
  end: string;
  duration: string; // e.g., "3 hours", "30 minutes"
}

export interface CompactAvailability {
  [date: string]: CompactSlot[];
}

function formatTime12Hour(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "h:mm a");
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function calculateDuration(startTime: Date, endTime: Date): string {
  const diffMs = endTime.getTime() - startTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const remainingMinutes = diffMinutes % 60;

  if (diffHours === 0) {
    return `${diffMinutes} minutes`;
  } else if (remainingMinutes === 0) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""}`;
  } else {
    return `${diffHours} hour${
      diffHours > 1 ? "s" : ""
    } ${remainingMinutes} minutes`;
  }
}

export function compactTimeSlots(
  availability: AvailabilityData,
  timezone: string
): CompactAvailability {
  const compact: CompactAvailability = {};

  for (const [dateStr, slots] of Object.entries(availability.data)) {
    if (slots.length === 0) continue;

    const compactSlots: CompactSlot[] = [];
    let currentRangeStart = new Date(slots[0].start);
    let currentRangeEnd = new Date(slots[0].end);

    for (let i = 1; i < slots.length; i++) {
      const currentSlotStart = new Date(slots[i].start);

      // Check if current slot is consecutive (starts when previous ends)
      if (currentSlotStart.getTime() === currentRangeEnd.getTime()) {
        // Extend the current range
        currentRangeEnd = new Date(slots[i].end);
      } else {
        // Gap found, save current range and start new one
        compactSlots.push({
          start: formatTime12Hour(currentRangeStart, timezone),
          end: formatTime12Hour(currentRangeEnd, timezone),
          duration: calculateDuration(currentRangeStart, currentRangeEnd),
        });

        currentRangeStart = new Date(slots[i].start);
        currentRangeEnd = new Date(slots[i].end);
      }
    }

    // Don't forget the last range
    compactSlots.push({
      start: formatTime12Hour(currentRangeStart, timezone),
      end: formatTime12Hour(currentRangeEnd, timezone),
      duration: calculateDuration(currentRangeStart, currentRangeEnd),
    });

    compact[dateStr] = compactSlots;
  }

  return compact;
}

// Alternative function for AI-friendly string format
export function slotsToAIString(
  availability: AvailabilityData,
  timezone: string
): string {
  const compact = compactTimeSlots(availability, timezone);
  const result: string[] = [];

  for (const [dateStr, slots] of Object.entries(compact)) {
    const formattedDate = formatDate(dateStr);
    const timeRanges = slots.map((slot) => {
      if (slot.start === slot.end) {
        return slot.start;
      }
      return `${slot.start} - ${slot.end} (${slot.duration})`;
    });

    result.push(`${formattedDate}: ${timeRanges.join(", ")}`);
  }

  return result.join("\n");
}

/**
 * Simple function: if datetime has offset, return it. If not, add timezone offset.
 * @param datetimeString - The datetime string
 * @param timezone - IANA timezone (e.g., 'Asia/Kolkata')
 * @returns ISO string with timezone offset
 */
export function createDateTimeWithTimezone(
  datetimeString: string,
  timezone: string
): string {
  // 1. Check if it already has timezone offset
  const hasOffset = /[+-]\d{2}:?\d{2}$|Z$/.test(datetimeString.trim());

  if (hasOffset) {
    return datetimeString; // Return as-is
  }

  // 2. Use date-fns-tz to get timezone offset string
  const offsetString = getTimezoneOffsetString(timezone);

  // 3. Format datetime with offset
  const normalizedDateTime = datetimeString.replace(" ", "T");
  const withMilliseconds = normalizedDateTime.includes(".")
    ? normalizedDateTime
    : normalizedDateTime + ".000";

  return `${withMilliseconds}${offsetString}`;
}

/**
 * Convert IANA timezone to offset string like +05:30 using date-fns-tz
 */
function getTimezoneOffsetString(timezone: string): string {
  // Use any date to get the timezone offset format
  const sampleDate = new Date("2023-06-15T12:00:00Z"); // Use a date that avoids DST edge cases

  // Use formatInTimeZone to get just the offset part
  const formattedWithOffset = formatInTimeZone(sampleDate, timezone, "XXX");

  return formattedWithOffset; // This will return something like '+05:30'
}

// Helper function to get timezone offset in minutes
function getTimezoneOffset(timezone: string, date: Date): number {
  return getTzOffset(timezone, date) / (1000 * 60); // Convert milliseconds to minutes
}
