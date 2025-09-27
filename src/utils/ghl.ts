// Get Agency from token
import { prisma } from "../lib/prisma.js";

export const getAPIKeyBusiness = async (api_token: string) => {
  //   const api_token = req.headers["api_token"] as string;
  if (!api_token) {
    throw new Error("UNAUTHORIZED");
  }
  const business = await prisma.apiKey.findUnique({
    where: { id: "07d26cda-6999-4dfe-95a3-0a112b7ff08c" },
    include: {
      Business: {
        include: {
          Providers: true,
        },
      },

      Agency: {
        select: {
          planIsActive: true,
        },
      },
    },
  });
  if (!business) {
    throw new Error("UNAUTHORIZED");
  }

  return business;
};

export const getPrimaryAgent = async (primaryAgentId: string) => {
  const primaryAgent = await prisma.primaryAgent.findUnique({
    where: {
      id: primaryAgentId,
    },
    include: {
      Business: {
        include: {
          BusinessIntegration: true,
        },
      },
    },
  });
  return primaryAgent;
};
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { format } from "date-fns";

export const chunkConsecutiveSlots = (
  slots: string[],
  timezone: string
): Array<{
  date: string;
  startTime: string;
  endTime: string;
  formattedRange: string;
}> => {
  if (!slots || slots.length === 0) return [];

  // Sort slots by date/time
  const sortedSlots = slots.sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const chunks: Array<{
    date: string;
    startTime: string;
    endTime: string;
    formattedRange: string;
  }> = [];

  let currentChunk: string[] = [sortedSlots[0]];

  const formatTimeInZone = (date: Date): string => {
    return formatInTimeZone(date, timezone, "h:mm a");
  };

  const formatDateInZone = (date: Date): string => {
    return formatInTimeZone(date, timezone, "EEE, MMM d");
  };

  for (let i = 1; i < sortedSlots.length; i++) {
    const currentSlot = toZonedTime(new Date(sortedSlots[i]), timezone);
    const lastSlot = toZonedTime(
      new Date(currentChunk[currentChunk.length - 1]),
      timezone
    );

    // Check if current slot is consecutive (30 minutes after the last one)
    const timeDiff = currentSlot.getTime() - lastSlot.getTime();
    const isConsecutive = timeDiff === 30 * 60 * 1000; // 30 minutes in milliseconds
    const isSameDay =
      format(currentSlot, "yyyy-MM-dd") === format(lastSlot, "yyyy-MM-dd");

    if (isConsecutive && isSameDay) {
      currentChunk.push(sortedSlots[i]);
    } else {
      // Process current chunk
      if (currentChunk.length > 0) {
        const chunkStart = toZonedTime(new Date(currentChunk[0]), timezone);
        const chunkEnd = toZonedTime(
          new Date(currentChunk[currentChunk.length - 1]),
          timezone
        );
        // Add 30 minutes to the end time to represent the end of the slot
        chunkEnd.setMinutes(chunkEnd.getMinutes() + 30);

        const date = formatDateInZone(chunkStart);
        const startTimeFormatted = formatTimeInZone(chunkStart);
        const endTimeFormatted = formatTimeInZone(chunkEnd);

        chunks.push({
          date: date,
          startTime: formatInTimeZone(
            chunkStart,
            timezone,
            "yyyy-MM-dd'T'HH:mm:ssXXX"
          ),
          endTime: formatInTimeZone(
            chunkEnd,
            timezone,
            "yyyy-MM-dd'T'HH:mm:ssXXX"
          ),
          formattedRange:
            currentChunk.length === 1
              ? `${date} at ${startTimeFormatted}`
              : `${date} from ${startTimeFormatted} to ${endTimeFormatted}`,
        });
      }

      // Start new chunk
      currentChunk = [sortedSlots[i]];
    }
  }

  // Process the last chunk
  if (currentChunk.length > 0) {
    const chunkStart = toZonedTime(new Date(currentChunk[0]), timezone);
    const chunkEnd = toZonedTime(
      new Date(currentChunk[currentChunk.length - 1]),
      timezone
    );
    chunkEnd.setMinutes(chunkEnd.getMinutes() + 30);

    const date = formatDateInZone(chunkStart);
    const startTimeFormatted = formatTimeInZone(chunkStart);
    const endTimeFormatted = formatTimeInZone(chunkEnd);

    chunks.push({
      date: date,
      startTime: formatInTimeZone(
        chunkStart,
        timezone,
        "yyyy-MM-dd'T'HH:mm:ssXXX"
      ),
      endTime: formatInTimeZone(chunkEnd, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX"),
      formattedRange:
        currentChunk.length === 1
          ? `${date} at ${startTimeFormatted}`
          : `${date} from ${startTimeFormatted} to ${endTimeFormatted}`,
    });
  }

  return chunks;
};
export function combineDateAndTime(date: string, time: string): string {
  // Returns ISO string if possible, else fallback
  if (!date || !time) return "";
  // If time is missing seconds, add ":00"
  if (/^\d{2}:\d{2}$/.test(time)) time += ":00";
  return new Date(`${date}T${time}`).toISOString();
}
