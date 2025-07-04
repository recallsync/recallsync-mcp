import { addDays, format, parse } from "date-fns";
import {
  BookAppointmentRequest,
  CheckAvailabilityRequest,
  GetAppointmentsRequest,
} from "../../schema/GHL/appointment.schema.js";
import {
  GetGHLAppointmentsResponse,
  GetGHLLocationResponse,
  GHLAppointment,
} from "../../types/ghl.types.js";
import { chunkConsecutiveSlots } from "../../utils/ghl.js";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { CALENDAR_TYPE, MEETING_SOURCE } from "../../generated/client/index.js";
import { bookMeeting, updateMeeting } from "../../utils/meeting-book.js";
import { prisma } from "../../lib/prisma.js";

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

type GetGHLAppointments = {
  ghlContactId: string;
  ghlAccessToken: string;
  timezone: string;
  locationId: string;
};

export const getAppointments = async ({
  ghlContactId,
  ghlAccessToken,
  timezone,
  locationId,
}: GetGHLAppointments) => {
  try {
    let path = `/contacts/${ghlContactId}/appointments`;
    const request = ghlRequestContructor({
      apiKey: ghlAccessToken,
      method: "GET",
      path,
    });

    const response = await request;
    const appointmentsData =
      (await response.json()) as GetGHLAppointmentsResponse;
    const appointments = appointmentsData.events;
    console.log({ timezone });

    // Filter out cancelled appointments
    const filteredAppointments = appointments?.filter(
      (appointment) => appointment.appointmentStatus !== "cancelled"
    );

    // Filter upcoming appointments
    const upcomingAppointments = filteredAppointments?.filter((appointment) => {
      const appointmentDate = new Date(appointment.startTime);
      const currentDate = new Date();
      return appointmentDate > currentDate;
    });

    // Map to agent data format
    const agentData = upcomingAppointments?.map((item) => ({
      rescheduleOrCancelId: item.id,
      title: item.title,
      start: item.startTime,
      end: item.endTime,
    }));

    console.log("agentData", { agentData });
    if (!agentData || agentData.length === 0) {
      return {
        success: false,
        data: "No appointments found",
      };
    }

    // Get location timezone with error handling
    let locationTimezone = "UTC"; // fallback timezone
    try {
      const locationData = await getLocation({
        apiKey: ghlAccessToken,
        locationId: locationId,
      });
      locationTimezone = locationData.data?.timezone || "UTC";
    } catch (locationError) {
      console.log(
        "Failed to get location timezone, using UTC fallback:",
        locationError
      );
    }

    console.log("locationTimezone:", locationTimezone);
    console.log("userTimezone:", timezone);

    let formattedResponse = "";
    let index = 1;
    for (const booking of agentData) {
      if (index === 1) {
        formattedResponse += `Here are your upcoming meetings: \n\n`;
      }

      const parsedStart = parse(
        booking.start,
        "yyyy-MM-dd HH:mm:ss",
        new Date()
      );
      const parsedEnd = parse(booking.end, "yyyy-MM-dd HH:mm:ss", new Date());

      const startUtc = fromZonedTime(parsedStart, locationTimezone);
      const endUtc = fromZonedTime(parsedEnd, locationTimezone);

      const formattedStart = formatInTimeZone(
        startUtc,
        timezone,
        "yyyy-MM-dd hh:mm a"
      );
      const formattedEnd = formatInTimeZone(
        endUtc,
        timezone,
        "yyyy-MM-dd hh:mm a"
      );

      formattedResponse += `Bookings :\n 
      **rescheduleOrCancelId: ${booking.rescheduleOrCancelId}**,\n
      Title: ${booking.title},\n
      Start: ${formattedStart},\n
      End: ${formattedEnd},\n
      \n --------------------------------- \n`;
      index++;
    }

    console.log("formattedResponse", { formattedResponse });
    return {
      success: true,
      data: {
        formatted: formattedResponse,
        appointments: agentData,
      },
    };
  } catch (err) {
    console.log("error getting appointments");
    console.log({ err });
    return {
      success: false,
      data: null,
    };
  }
};
interface CheckAvailabilityInput {
  input: CheckAvailabilityRequest;
  ghlAccessToken: string;
  ghlCalendarId: string;
}

export const checkAvailability = async ({
  input,
  ghlAccessToken,
  ghlCalendarId,
}: CheckAvailabilityInput) => {
  const { startDate: startDateString, timezone } = input;
  // Convert date string to timestamp (start of day)
  const startDate = new Date(startDateString).getTime();

  let currentStartTime = startDate;
  let currentEndTime = addDays(startDate, 1).getTime();
  let iterations = 0;
  const maxIterations = 3;
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
  while (iterations < maxIterations) {
    iterations++;

    const normalizedStartDate = getStartOfDay(currentStartTime);
    const normalizedEndDate = getEndOfDay(currentEndTime);

    let path = `/calendars/${ghlCalendarId}/free-slots`;
    const queryParams = new URLSearchParams();
    queryParams.append("startDate", normalizedStartDate.toString());
    queryParams.append("endDate", normalizedEndDate.toString());
    if (timezone) queryParams.append("timezone", timezone);
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
    if (iterations < maxIterations) {
      // increment the start and end date by 1 day
      currentStartTime = addDays(currentStartTime, 1).getTime();
      currentEndTime = addDays(currentEndTime, 1).getTime();
    }
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
  input: BookAppointmentRequest;
  ghlCalendarId: string;
  ghlAccessToken: string;
  businessId: string;
  agencyId: string;
  ghlContactId: string;
  ghlLocationId: string;
  previousTimezone?: string;
  leadId: string;
};
export const bookAppointment = async ({
  businessId,
  ghlContactId,
  ghlCalendarId,
  input,
  agencyId,
  ghlAccessToken,
  ghlLocationId,
  previousTimezone,
  leadId,
}: BookGHLAppointment) => {
  try {
    const { dateTime: startTime, leadId, timezone } = input;
    let path = `/calendars/events/appointments`;
    console.log("book appointment", startTime);
    const startTimeUTC = new Date(startTime).toISOString();
    const request = ghlRequestContructor({
      apiKey: ghlAccessToken,
      method: "POST",
      path,
      body: {
        calendarId: ghlCalendarId,
        locationId: ghlLocationId,
        contactId: ghlContactId,
        startTime: startTimeUTC,
      },
    });
    const response = await request;
    const appointmentData = (await response.json()) as GHLAppointment;
    if (response.ok) {
      // Use transaction for database operations
      await prisma.$transaction(async (tx) => {
        // Update contact timezone if different
        if (timezone !== previousTimezone) {
          await updateContact({
            contactId: appointmentData.contactId,
            ghlAccessToken,
            timezone,
            leadId,
            transaction: tx,
          });
        }

        // Book meeting
        await bookMeeting({
          businessId,
          startTime: new Date(startTime).toISOString(),
          leadId,
          agencyId,
          meetingId: appointmentData.id,
          caledarType: CALENDAR_TYPE.GHL,
          meetingSource: MEETING_SOURCE.DASHBOARD,
          status: "UPCOMING",
          meetingUrl: appointmentData.address,
          transaction: tx,
        });
      });
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
type UpdateGHLAppointment =
  | {
      rescheduleOrCancelId: string;
      businessId: string;
      type: "cancel";
      leadId: string;
      agencyId: string;
      ghlAccessToken: string;
    }
  | {
      rescheduleOrCancelId: string;
      businessId: string;
      type: "reschedule";
      locationTimezone?: string;
      newStartTime: string;
      leadId: string;
      ghlAccessToken: string;
      agencyId: string;
    };

export const updateAppointment = async (props: UpdateGHLAppointment) => {
  try {
    const path = `/calendars/events/appointments/${props.rescheduleOrCancelId}`;
    // Build update body based on what's provided
    const updateBody: Record<string, any> = {};
    if (props.type === "reschedule") {
      const startTime = props.newStartTime; // iso string
      updateBody.startTime = startTime;
    }
    if (props.type === "cancel") {
      updateBody.appointmentStatus = "cancelled";
    }

    const request = ghlRequestContructor({
      apiKey: props.ghlAccessToken,
      method: "PUT",
      path,
      body: updateBody,
    });

    const response = await request;
    const appointmentData = await response.json();
    if (response.ok) {
      // Use transaction for database operations
      await prisma.$transaction(async (tx) => {
        const appointment = await tx.meeting.findUnique({
          where: {
            id: props.rescheduleOrCancelId,
          },
        });
        if (appointment) {
          console.log({ appointment }, "update");
          await updateMeeting({
            meetingId: appointmentData.id,
            newStartTime: new Date(appointment.startTime),
            status: "UPCOMING",
            transaction: tx,
          });
        } else {
          console.log("create");
          const scheduledAt = new Date(
            props.type === "reschedule"
              ? props.newStartTime
              : appointmentData.startTime
          );
          await bookMeeting({
            businessId: props.businessId,
            startTime: scheduledAt,
            leadId: "",
            agencyId: props.agencyId,
            meetingId: appointmentData.id,
            caledarType: CALENDAR_TYPE.GHL,
            meetingSource: MEETING_SOURCE.OUTSIDE,
            status: "UPCOMING",
            transaction: tx,
          });
        }
      });
    }
    return {
      success: true,
      data: appointmentData,
    };
  } catch (err) {
    console.log("error updating appointment");
    console.log({ err });
    return {
      success: false,
      data: null,
    };
  }
};
interface UpdateContact {
  contactId: string;
  ghlAccessToken: string;
  timezone: string;
  leadId: string;
  transaction?: any;
}
export const updateContact = async (props: UpdateContact) => {
  try {
    const path = `/contacts/${props.contactId}`;
    const updateBody: Record<string, any> = {
      timezone: props.timezone,
    };
    const request = ghlRequestContructor({
      apiKey: props.ghlAccessToken,
      method: "PUT",
      path,
      body: updateBody,
    });

    const response = await request;
    const appointmentData = await response.json();
    if (response.ok) {
      const dbClient = props.transaction || prisma;
      const updatedContact = await dbClient.lead.update({
        where: {
          id: props.leadId,
        },
        data: {
          ianaTimezone: props.timezone,
        },
      });
    }
    return {
      success: true,
      data: appointmentData,
    };
  } catch (err) {
    console.log("error updating appointment");
    console.log({ err });
    return {
      success: false,
      data: null,
    };
  }
};

export const getLocation = async ({
  apiKey,
  locationId,
}: {
  apiKey: string;
  locationId: string;
}) => {
  try {
    const path = `/locations/${locationId}`;

    const request = ghlRequestContructor({
      apiKey,
      method: "GET",
      path,
    });

    const response = await request;
    const locationData = (await response.json()) as GetGHLLocationResponse;
    const location = locationData.location;
    return {
      success: true,
      data: location,
    };
  } catch (err) {
    console.log("error getting location");
    console.log({ err });
    return {
      success: false,
      data: null,
    };
  }
};
