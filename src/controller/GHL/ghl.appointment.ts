import { CheckAvailabilityRequest } from "../../schema/GHL/appointment.schema.js";
import { chunkConsecutiveSlots } from "../../utils/ghl.js";

type GHLRequestConstructor = {
  apiKey: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  path: string;
};
export const ghlRequestContructor = ({
  apiKey,
  method,
  path,
  body,
}: GHLRequestConstructor) => {
  const ghlUrl = "https://services.leadconnectorhq.com";
  const url = `${ghlUrl}${path}`;

  const request = fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Version: "2021-04-15",
    },
    body: JSON.stringify(body),
  });

  return request;
};

// Fix: Use interface for CheckAvailabilityInput
interface CheckAvailabilityInput {
  input: { date: number; timezone: string };
  ghlAccessToken?: string;
  ghlCalendarId?: string;
}

export const checkAvailability = async ({
  input,
  ghlAccessToken,
  ghlCalendarId,
}: CheckAvailabilityInput) => {
  const { date, timezone } = input;
  console.log({ input });
  // Convert date string to timestamp (start of day)
  const startDate = date;
  const currentStartTime = startDate;
  const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
  const currentEndTime = currentStartTime + twoDaysInMs;

  // Function to normalize timestamp to start of day (00:00:00)
  const getStartOfDay = (timestamp: number) => {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  };

  // Function to normalize timestamp to end of day (23:59:59.999)
  const getEndOfDay = (timestamp: number) => {
    const date = new Date(timestamp);
    date.setHours(23, 59, 59, 999);
    return date.getTime();
  };

  console.log({ currentStartTime, currentEndTime });
  const normalizedStartDate = getStartOfDay(currentStartTime);
  const normalizedEndDate = getEndOfDay(currentEndTime);

  let path = `/calendars/${ghlCalendarId}/free-slots`;
  const queryParams = new URLSearchParams();
  queryParams.append("startDate", normalizedStartDate.toString());
  queryParams.append("endDate", normalizedEndDate.toString());
  if (timezone) queryParams.append("timezone", "Asia/Calcutta");
  path = `${path}?${queryParams.toString()}`;

  console.log({ path, timezone, normalizedStartDate, normalizedEndDate });
  const request = ghlRequestContructor({
    apiKey: ghlAccessToken || "",
    method: "GET",
    path,
  });

  const response = await request;
  const slotsData = await response.json();
  console.log({ slotsData });
  // Extract slots from the response format where dates are keys and slots are arrays
  // Format: { "2025-05-12": { "slots": ["2025-05-12T13:00:00-04:00", "2025-05-12T13:15:00-04:00"] } }
  const slots: string[] = [];
  if (slotsData && typeof slotsData === "object") {
    // Iterate through all date keys
    Object.keys(slotsData).forEach((dateKey) => {
      if (
        slotsData[dateKey] &&
        slotsData[dateKey].slots &&
        Array.isArray(slotsData[dateKey].slots)
      ) {
        // Add each slot from this date to our array
        slots.push(...slotsData[dateKey].slots);
      }
    });
  }

  // If we found slots, return them
  if (slots.length > 0) {
    return slots;
  }

  return [];
};

export const getAvailableChunkedSlots = async (
  props: CheckAvailabilityInput
) => {
  const slots = await checkAvailability(props);
  const chunkedSlots = chunkConsecutiveSlots(slots);

  return chunkedSlots;
};
type BookGHLAppointment = {
  businessId?: string;
  ghlContactId?: string;
  calendarId: string;
  contactId: string;
  startTime: string;
  agencyId: string;
  ghlAccessToken: string;
  ghlLocationId: string;
};
export const bookAppointment = async ({
  businessId,
  ghlContactId,
  calendarId,
  startTime,
  contactId,
  agencyId,
  ghlAccessToken,
  ghlLocationId,
}: BookGHLAppointment) => {
  try {
    let path = `/calendars/events/appointments`;

    const request = ghlRequestContructor({
      apiKey: ghlAccessToken || "",
      method: "POST",
      path,
      body: {
        calendarId,
        locationId: ghlLocationId,
        contactId: ghlContactId,
        startTime,
      },
    });
    const response = await request;
    const appointmentData = await response.json();
    if (response.ok) {
      console.log("booked appointment", { appointmentData });
      // if (localContact) {
      // await prisma.appointment.create({
      //   data: {
      //     id: appointmentData.id,
      //     businessId: businessId,
      //     agencyId: agencyId,
      //     contactId: contactId,
      //     status: "BOOKED",
      //     source: "AGENT_KONG",
      //     scheduledAt: new Date(startTime),
      //     updatedAt: new Date(),
      //   },
      // });
      // }
    }
    return {
      success: true,
      data: appointmentData,
    };
  } catch (err) {
    console.log("error booking appointment");
    console.log({ err });
    return {
      success: false,
      data: null,
    };
  }
};
