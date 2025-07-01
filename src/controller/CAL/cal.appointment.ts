import { CalenderIntegration } from "@prisma/client";
import {
  BookAppointmentRequest,
  CheckAvailabilityRequest,
  RescheduleAppointmentRequest,
} from "../../schema/CAL/appointment.schema.js";
import { format, addDays } from "date-fns";
import axios, { AxiosError } from "axios";
import {
  AvailabilityData,
  BookAppointmentInput,
  BookAppointmentResponse,
} from "../../types/cal.types.js";
import {
  CompactAvailability,
  compactTimeSlots,
  slotsToAIString,
} from "../../utils/ca.utils.js";

type CheckAvailabilityInput = {
  args: CheckAvailabilityRequest;
  calendar: CalenderIntegration;
};
export const checkAvailability = async ({
  args,
  calendar,
}: CheckAvailabilityInput) => {
  const { startDate, timezone } = args;
  console.log("checkAvailability args", { args });
  const { calEventId, calApiKey } = calendar;

  let start = format(new Date(startDate), "yyyy-MM-dd");
  let end = format(addDays(new Date(start), 2), "yyyy-MM-dd");

  let availability: CompactAvailability = {};
  let iteration = 0;
  const MAX_ITERATIONS = 3;

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    try {
      const availabilityData = await getAvailableSlots({
        calEventId,
        calApiKey,
        start,
        end,
        timeZone: timezone,
      });

      // Check if we have any slots available
      if (
        availabilityData.data &&
        Object.keys(availabilityData.data).length > 0
      ) {
        // Check if any date actually has slots (not just empty arrays)
        const hasActualSlots = Object.values(availabilityData.data).some(
          (slots) => slots && slots.length > 0
        );

        if (hasActualSlots) {
          const compact = compactTimeSlots(availabilityData);
          availability = compact;
          break;
        }
      }

      // No slots found, move to next range
      console.log(
        `No slots found for ${start} to ${end}, trying next range...`
      );
    } catch (err) {
      console.error(`Error fetching availability for ${start} to ${end}:`, err);
      // Continue to next iteration even on error
    }

    // Move to next range of dates (2 days forward)
    start = format(addDays(new Date(start), 2), "yyyy-MM-dd");
    end = format(addDays(new Date(end), 2), "yyyy-MM-dd");
  }

  if (Object.keys(availability).length === 0) {
    console.log(`No availability found after ${MAX_ITERATIONS} attempts`);
  }

  return availability;
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

type BookAppointmentProps = {
  args: BookAppointmentRequest;
  calendar: CalenderIntegration;
  businessName: string;
};
export const bookAppointment = async ({
  args,
  calendar,
  businessName,
}: BookAppointmentProps) => {
  try {
    const { startTime, timezone, name, email } = args;
    const { calEventId, calApiKey } = calendar;

    const payload: BookAppointmentInput = {
      eventTypeId: +calEventId,
      start: new Date(startTime).toISOString(),
      metadata: {
        source: "MCP",
      },
      attendee: {
        email: email,
        name: name,
        timeZone: timezone,
      },
      bookingFieldsResponses: {
        title: `Meeting between ${businessName} and ${name}`,
      },
    };
    console.log("bookAppointment Payload", { payload });
    const res = await axios.post<BookAppointmentResponse>(
      `https://api.cal.com/v2/bookings`,
      payload,
      {
        headers: {
          "cal-api-version": "2024-08-13",
          Authorization: `Bearer ${calApiKey}`,
        },
      }
    );
    const data = res.data; // for @db
    console.log("Appointment booked successfully", data);
    return `Appointment booked successfully. Booking URL: ${data.data.meetingUrl}, Booking uid: ${data.data.uid}`;
  } catch (err) {
    console.log({ err });
    if (err instanceof AxiosError) {
      console.log({ err: JSON.stringify(err.response?.data) });
    }
    return "Appointment booking failed, ask for another time or date-time";
  }
};

type RescheduleAppointmentProps = {
  args: RescheduleAppointmentRequest;
  calendar: CalenderIntegration;
};
export const rescheduleAppointment = async ({
  args,
  calendar,
}: RescheduleAppointmentProps) => {
  try {
    const { startTime, uid } = args;
    const start = new Date(startTime).toISOString();
    const { calApiKey } = calendar;
    const res = await axios.post<BookAppointmentResponse>(
      `https://api.cal.com/v2/bookings/${uid}/reschedule`,
      {
        start: new Date(start).toISOString(),
        rescheduledBy: "MCP",
        reschedulingReason: "User requested reschedule",
      },
      {
        headers: {
          "cal-api-version": "2024-08-13",
          Authorization: `Bearer ${calApiKey}`,
        },
      }
    );
    const data = res.data; // for @db
    console.log("Appointment rescheduled successfully", data);
    return `Appointment rescheduled successfully. Booking ID: ${data.data.id}, Booking URL: ${data.data.meetingUrl}, Booking UID: ${data.data.uid}`;
  } catch (err) {
    if (err instanceof AxiosError) {
      console.log({ err: JSON.stringify(err.response?.data) });
    }
    return "Appointment rescheduling failed, ask for another time or date-time";
  }
};
