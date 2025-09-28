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
import { formatInTimeZone } from "date-fns-tz";

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

  // Helper function to format time in the target timezone from ISO string
  const formatTimeInZone = (isoString: string): string => {
    return formatInTimeZone(new Date(isoString), timezone, "h:mm a");
  };

  // Helper function to format date in the target timezone from ISO string
  const formatDateInZone = (isoString: string): string => {
    return formatInTimeZone(new Date(isoString), timezone, "EEE, MMM d");
  };

  // Helper function to get date string in target timezone for comparison
  const getDateInZone = (isoString: string): string => {
    return formatInTimeZone(new Date(isoString), timezone, "yyyy-MM-dd");
  };

  for (let i = 1; i < sortedSlots.length; i++) {
    const currentSlot = new Date(sortedSlots[i]);
    const lastSlot = new Date(currentChunk[currentChunk.length - 1]);

    // Check if current slot is consecutive (30 minutes after the last one)
    const timeDiff = currentSlot.getTime() - lastSlot.getTime();
    const isConsecutive = timeDiff === 30 * 60 * 1000; // 30 minutes in milliseconds
    const isSameDay =
      getDateInZone(sortedSlots[i]) ===
      getDateInZone(currentChunk[currentChunk.length - 1]);

    if (isConsecutive && isSameDay) {
      currentChunk.push(sortedSlots[i]);
    } else {
      // Process current chunk
      if (currentChunk.length > 0) {
        const chunkStartISO = currentChunk[0];
        const chunkEndISO = currentChunk[currentChunk.length - 1];

        // Add 30 minutes to the end time to represent the end of the slot
        const chunkEndDate = new Date(chunkEndISO);
        chunkEndDate.setMinutes(chunkEndDate.getMinutes() + 30);
        const chunkEndWithDuration = chunkEndDate.toISOString();

        const date = formatDateInZone(chunkStartISO);
        const startTimeFormatted = formatTimeInZone(chunkStartISO);
        const endTimeFormatted = formatTimeInZone(chunkEndWithDuration);

        chunks.push({
          date: date,
          startTime: formatInTimeZone(
            new Date(chunkStartISO),
            timezone,
            "yyyy-MM-dd'T'HH:mm:ssXXX"
          ),
          endTime: formatInTimeZone(
            new Date(chunkEndWithDuration),
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
    const chunkStartISO = currentChunk[0];
    const chunkEndISO = currentChunk[currentChunk.length - 1];

    // Add 30 minutes to the end time to represent the end of the slot
    const chunkEndDate = new Date(chunkEndISO);
    chunkEndDate.setMinutes(chunkEndDate.getMinutes() + 30);
    const chunkEndWithDuration = chunkEndDate.toISOString();

    const date = formatDateInZone(chunkStartISO);
    const startTimeFormatted = formatTimeInZone(chunkStartISO);
    const endTimeFormatted = formatTimeInZone(chunkEndWithDuration);

    chunks.push({
      date: date,
      startTime: formatInTimeZone(
        new Date(chunkStartISO),
        timezone,
        "yyyy-MM-dd'T'HH:mm:ssXXX"
      ),
      endTime: formatInTimeZone(
        new Date(chunkEndWithDuration),
        timezone,
        "yyyy-MM-dd'T'HH:mm:ssXXX"
      ),
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
