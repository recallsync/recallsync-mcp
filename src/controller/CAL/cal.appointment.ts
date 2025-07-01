import { CalenderIntegration } from "@prisma/client";
import { CheckAvailabilityRequest } from "../../schema/CAL/appointment.schema.js";
import { format, addDays } from "date-fns";
import axios from "axios";
import { AvailabilityData } from "../../types/cal.types.js";
import { compactTimeSlots, slotsToAIString } from "../../utils/ca.utils.js";

type CheckAvailabilityInput = {
  args: CheckAvailabilityRequest;
  calendar: CalenderIntegration;
};
export const checkAvailability = async ({
  args,
  calendar,
}: CheckAvailabilityInput) => {
  const { startDate, timezone } = args;
  const { calEventId, calApiKey } = calendar;

  let start = format(new Date(startDate), "yyyy-MM-dd");
  let end = format(addDays(new Date(start), 2), "yyyy-MM-dd");

  let formattedSlotsString = "";
  let iteration = 0;
  while (true) {
    iteration++;
    if (iteration > 3) {
      break;
    }
    // keep searching for slots until we find available slots
    try {
      const availabilityData = await getAvailableSlots({
        calEventId,
        calApiKey,
        start,
        end,
        timeZone: timezone,
      });

      if (Object.keys(availabilityData.data).length === 0) {
        // no slots found (move to next range of dates)
        start = format(addDays(new Date(start), 2), "yyyy-MM-dd");
        end = format(addDays(new Date(end), 2), "yyyy-MM-dd");
        continue;
      }
      const compact = compactTimeSlots(availabilityData);

      const aiString = slotsToAIString(availabilityData);

      formattedSlotsString = aiString;
      break;
    } catch (err) {
      // move to next range of dates (2 days  )
      start = format(addDays(new Date(start), 2), "yyyy-MM-dd");
      end = format(addDays(new Date(end), 2), "yyyy-MM-dd");
    }
  }

  return formattedSlotsString;
};
type GetAvailableSlotsInput = {
  calEventId: string;
  calApiKey: string;
  start: string; // 2025-07-01
  end: string; // 2025-07-03
  timeZone: string; // Asia/Kolkata
};
export const getAvailableSlots = async ({
  calEventId,
  calApiKey,
  start,
  end,
  timeZone,
}: GetAvailableSlotsInput) => {
  const raw = await axios.get<AvailabilityData>(
    `https://api.cal.com/v2/slots?eventTypeId=${calEventId}&start=${start}&end=${end}&timeZone=${timeZone}&format=range`,
    {
      headers: {
        "cal-api-version": "2024-09-04",
        Authorization: `Bearer ${calApiKey}`,
      },
    }
  );
  return raw.data;
};
