import { addDays, format, parse } from "date-fns";
import {
  BookAppointmentRequest,
  CheckAvailabilityRequest,
  GetAppointmentsRequest,
} from "../../schema/GHL/appointment.schema.js";
import {
  GetGHLAppointmentsResponse,
  GHLAppointment,
} from "../../types/ghl.types.js";
import { chunkConsecutiveSlots } from "../../utils/ghl.js";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { CALENDAR_TYPE, MEETING_SOURCE } from "@prisma/client";
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
};

export const getAppointments = async ({
  ghlContactId,
  ghlAccessToken,
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
    console.log({ appointmentsData, appointments });
    // convert the appointment date to ISO string - parse from location timezone
    // filter out the upcoming appointments - "startTime": "2025-06-13 09:00:00"
    const filteredAppointments = appointments?.filter(
      (appointment) => appointment.appointmentStatus !== "cancelled"
    );
    const upcomingAppointments = filteredAppointments?.filter((appointment) => {
      const appointmentDate = new Date(appointment.startTime);
      // Convert current date to appointment timezone if provided
      const currentDate = new Date();
      return appointmentDate > currentDate;
    });

    // // agent only needs startTime and id
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
    let formattedResponse = "";
    let index = 1;
    for (const booking of agentData) {
      if (index === 1) {
        formattedResponse += `Here are your upcoming meetings: \n\n`;
      }
      formattedResponse += `Bookings :\n 
      **rescheduleOrCancelId: ${
        booking.rescheduleOrCancelId
      }**,\n      Title: ${booking.title},\n      Start: ${format(
        new Date(booking.start),
        "yyyy-MM-dd HH:mm a"
      )},\n      End: ${format(
        new Date(booking.end),
        "yyyy-MM-dd HH:mm a"
      )},\n      \n --------------------------------- \n`;
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
};
export const bookAppointment = async ({
  businessId,
  ghlContactId,
  ghlCalendarId,
  input,
  agencyId,
  ghlAccessToken,
  ghlLocationId,
}: BookGHLAppointment) => {
  try {
    const { dateTime: startTime, leadId } = input;
    let path = `/calendars/events/appointments`;
    console.log("book appointment", startTime);
    const request = ghlRequestContructor({
      apiKey: ghlAccessToken || "",
      method: "POST",
      path,
      body: {
        calendarId: ghlCalendarId,
        locationId: ghlLocationId,
        contactId: ghlContactId,
        startTime: new Date(startTime).toISOString(),
      },
    });
    const response = await request;
    const appointmentData = (await response.json()) as GHLAppointment;
    console.log("appointmentData", response);
    if (response.ok) {
      console.log("appointmentData", appointmentData);
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
      const appointment = await prisma.meeting.findUnique({
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
        });
      }
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
