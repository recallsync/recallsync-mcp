import {
  AUTOMATION_EVENT,
  CALENDAR_TYPE,
  CalenderIntegration,
  Lead,
  MEETING_SOURCE,
  MESSAGE_SENDER,
  SYSTEM_EVENT,
  SYSTEM_EVENT_STATUS,
} from "../../generated/client/index.js";
import {
  BookAppointmentRequest,
  CancelAppointmentRequest,
  CheckAvailabilityRequest,
  GetCalBookingsRequest,
  RescheduleAppointmentRequest,
} from "../../schema/CAL/appointment.schema.js";
import { format, addDays } from "date-fns";
import axios, { AxiosError } from "axios";
import {
  AvailabilityData,
  BookAppointmentInput,
  BookAppointmentResponse,
  GetCalBookingsResponse,
} from "../../types/cal.types.js";
import {
  CompactAvailability,
  compactTimeSlots,
  slotsToAIString,
} from "../../utils/cal.utils.js";
import { bookMeeting, updateMeeting } from "../../utils/meeting-book.js";
import {
  LeadWithBizz,
  triggerAutomation,
} from "../../utils/integration.util.js";
import { prisma } from "../../lib/prisma.js";
import { formatInTimeZone } from "date-fns-tz";

type CheckAvailabilityInput = {
  args: CheckAvailabilityRequest;
  calendar: CalenderIntegration;
  lead: LeadWithBizz;
};
export const checkAvailability = async ({
  args,
  calendar,
  lead,
}: CheckAvailabilityInput) => {
  if (!lead) return;
  const { id, agencyId, businessId } = lead;
  const { startDate, timezone } = args;
  const { calEventId, calApiKey } = calendar;
  const GAP = 1; // 1 day gap between start and end

  let start = format(new Date(startDate), "yyyy-MM-dd");
  let end = format(addDays(new Date(start), GAP), "yyyy-MM-dd");

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
          const compact = compactTimeSlots(availabilityData, timezone);
          const aiString = slotsToAIString(availabilityData, timezone);
          availability = compact;

          // create a system message
          const conversationId = lead.Conversation?.id;
          if (conversationId) {
            await prisma.conversationMessage.create({
              data: {
                content: "Checked availability",
                sender: MESSAGE_SENDER.SYSTEM,
                businessId: businessId,
                agencyId: agencyId,
                leadId: id,
                conversationId,
                // system fields
                systemEvent: SYSTEM_EVENT.AVAILABILITY_CHECK,
                systemDescription: `Here are the available slots: ${aiString}`,
                systemData: {
                  input: {
                    ...args,
                  },
                  output: {
                    compact: JSON.parse(JSON.stringify(availability)),
                    raw: availabilityData,
                  },
                },
              },
            });
          }

          break;
        }
      }

      // No slots found, move to next range
    } catch (err) {
      console.error(`Error fetching availability for ${start} to ${end}:`, err);
    }

    // Move to next range of dates (2 days forward)
    start = format(addDays(new Date(start), GAP), "yyyy-MM-dd");
    end = format(addDays(new Date(end), GAP), "yyyy-MM-dd");
    // wait for 500ms
    await new Promise((resolve) => setTimeout(resolve, 500));
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

  lead: LeadWithBizz;
};
export const bookAppointment = async ({
  args,
  calendar,
  businessName,
  lead,
}: BookAppointmentProps) => {
  try {
    if (!lead) return;
    const { dateTime, timezone, name, email, leadId } = args;
    const { calEventId, calApiKey } = calendar;
    const {
      id,
      agencyId,
      businessId,
      Business: { Automations },
    } = lead;

    const fieldsToUpdate: Partial<Record<keyof Lead, string>> = {};
    if (lead.name !== args.name) {
      fieldsToUpdate.name = args.name;
    }
    if (lead.email !== args.email) {
      fieldsToUpdate.email = args.email;
    }
    if (lead.ianaTimezone !== timezone) {
      fieldsToUpdate.ianaTimezone = timezone;
    }
    const canUpdateFields = Object.keys(fieldsToUpdate).length > 0;

    const payload: BookAppointmentInput = {
      eventTypeId: +calEventId,
      start: formatInTimeZone(
        new Date(dateTime),
        timezone,
        "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"
      ),
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
    const conversationId = lead.Conversation?.id;
    if (data) {
      await prisma.$transaction(async (tx) => {
        if (conversationId) {
          await prisma.conversationMessage.create({
            data: {
              content: "Booked appointment",
              sender: MESSAGE_SENDER.SYSTEM,
              businessId: businessId,
              agencyId: agencyId,
              leadId: id,
              conversationId,
              // system fields
              systemEvent: SYSTEM_EVENT.BOOK_APPOINTMENT,
              systemDescription: `The appointment has been booked for ${formatInTimeZone(
                new Date(dateTime),
                timezone,
                "dd MMM yyyy, hh:mm a"
              )} (TZ: ${timezone})`,
              systemData: {
                input: {
                  args,
                  payload,
                },
                output: {
                  data: data,
                },
              },
            },
          });
        }
        await bookMeeting({
          businessId: businessId,
          startTime: new Date(dateTime).toISOString(),
          leadId: leadId,
          agencyId: agencyId,
          meetingId: data.data.uid,
          caledarType: CALENDAR_TYPE.CAL,
          meetingSource: MEETING_SOURCE.PLATFORM,
          status: "UPCOMING",
          meetingUrl: data.data.meetingUrl,
          automations: Automations,
          leadFieldsToUpdate: canUpdateFields ? fieldsToUpdate : undefined,
          transaction: tx,
        });
      });

      return `Appointment booked successfully. Booking URL: ${data.data.meetingUrl}, **rescheduleOrCancelId: ${data.data.uid}**`;
    }
  } catch (err) {
    if (err instanceof AxiosError) {
      console.log({ err: JSON.stringify(err.response?.data) });
      return "Appointment booking failed:" + err.response?.data.message;
    }
    return "Appointment booking failed, give user another timeslot around the same time";
  }
};

type RescheduleAppointmentProps = {
  args: RescheduleAppointmentRequest;
  calendar: CalenderIntegration;
  lead: LeadWithBizz;
};
export const rescheduleAppointment = async ({
  args,
  calendar,
  lead,
}: RescheduleAppointmentProps) => {
  try {
    if (!lead) return;
    const ianaTimezone = lead.ianaTimezone;
    const { newStartTime, rescheduleOrCancelId } = args;

    // Format the time in the lead's timezone without converting to UTC
    const start = formatInTimeZone(
      newStartTime,
      ianaTimezone,
      "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"
    );
    console.log({ start });

    const { calApiKey } = calendar;
    const {
      id,
      agencyId,
      businessId,
      Business: { Automations },
    } = lead;
    const res = await axios.post<BookAppointmentResponse>(
      `https://api.cal.com/v2/bookings/${rescheduleOrCancelId}/reschedule`,
      {
        start,
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
    const conversationId = lead.Conversation?.id;
    if (data.data) {
      await prisma.$transaction(async (tx) => {
        if (conversationId) {
          await prisma.conversationMessage.create({
            data: {
              content: "Updated appointment",
              sender: MESSAGE_SENDER.SYSTEM,
              businessId: businessId,
              agencyId: agencyId,
              leadId: id,
              conversationId,
              // system fields
              systemEvent: SYSTEM_EVENT.RESCHEDULE_APPOINTMENT,
              systemDescription: `Rescheduled the appointment to ${formatInTimeZone(
                new Date(start),
                ianaTimezone,
                "dd MMM yyyy, hh:mm a"
              )} (TZ: ${ianaTimezone})`,
              systemData: {
                input: {
                  ...args,
                },
                output: {
                  data: data,
                },
              },
            },
          });
        }

        const newMeetingId = data.data.uid;

        // Check if meeting exists before updating
        const existingMeeting = await tx.meeting.findUnique({
          where: { meetingId: rescheduleOrCancelId },
        });
        let updatedMeeting;
        if (existingMeeting) {
          updatedMeeting = await tx.meeting.update({
            where: { id: existingMeeting.id },
            data: {
              meetingId: newMeetingId,
              startTime: new Date(start).toISOString(),
            },
          });
        } else {
          // Create a new meeting record if the original doesn't exist
          updatedMeeting = await tx.meeting.create({
            data: {
              meetingId: newMeetingId,
              businessId: businessId,
              agencyId: agencyId,
              leadId: id,
              status: "UPCOMING",
              startTime: new Date(start).toISOString(),
              messageOfLead: "",
              calendarType: CALENDAR_TYPE.CAL,
              meetingSource: MEETING_SOURCE.OUTSIDE,
              meetingUrl: data.data.meetingUrl || "",
            },
          });
        }

        // send event to automation
        await triggerAutomation({
          automations: Automations,
          event: AUTOMATION_EVENT.MEETING_UPDATED,
          data: { meeting: existingMeeting, updatedMeeting },
        });
        await triggerAutomation({
          automations: Automations,
          event: AUTOMATION_EVENT.MEETING_EVENTS,
          data: { meeting: existingMeeting, updatedMeeting },
        });
      });
    }
    return `Appointment rescheduled successfully. Booking ID: ${data.data.id}, Booking URL: ${data.data.meetingUrl}, Updated **rescheduleOrCancelId: ${data.data.uid}**`;
  } catch (err) {
    if (err instanceof AxiosError) {
      console.log({ err: JSON.stringify(err.response?.data) });
    }
    return "Appointment rescheduling failed, get upcoming appointments";
  }
};

type CancelAppointmentProps = {
  args: CancelAppointmentRequest;
  calendar: CalenderIntegration;
  lead: LeadWithBizz;
};
export const cancelAppointment = async ({
  args,
  calendar,
  lead,
}: CancelAppointmentProps) => {
  try {
    if (!lead) return;
    console.log({ args });
    const { rescheduleOrCancelId } = args;
    const { calApiKey } = calendar;
    const {
      id,
      agencyId,
      businessId,
      Business: { Automations },
    } = lead;
    const res = await axios.post<BookAppointmentResponse>(
      `https://api.cal.com/v2/bookings/${rescheduleOrCancelId}/cancel`,
      {
        cancellationReason: "User requested cancellation",
      },
      {
        headers: {
          "cal-api-version": "2024-08-13",
          Authorization: `Bearer ${calApiKey}`,
        },
      }
    );
    const data = res.data; // for @db
    const newMeetingId = data.data.uid;
    const conversationId = lead.Conversation?.id;
    if (data.data) {
      await prisma.$transaction(async (tx) => {
        if (conversationId) {
          await prisma.conversationMessage.create({
            data: {
              content: "Cancelled appointment",
              sender: MESSAGE_SENDER.SYSTEM,
              businessId: businessId,
              agencyId: agencyId,
              leadId: id,
              conversationId,
              // system fields
              systemEvent: SYSTEM_EVENT.CANCEL_APPOINTMENT,
              systemDescription: `Cancelled the appointment`,
              systemData: {
                input: {
                  ...args,
                },
                output: {
                  data: data,
                },
              },
            },
          });
        }
        // Check if meeting exists before updating
        const existingMeeting = await tx.meeting.findUnique({
          where: { meetingId: rescheduleOrCancelId },
        });

        let updatedMeeting;

        if (existingMeeting) {
          updatedMeeting = await updateMeeting({
            meetingId: rescheduleOrCancelId,
            status: "CANCELLED",
            transaction: tx,
          });
        } else {
          // Create a new meeting record if the original doesn't exist
          updatedMeeting = await tx.meeting.create({
            data: {
              meetingId: newMeetingId,
              businessId: businessId,
              agencyId: agencyId,
              leadId: id,
              status: "CANCELLED",
              startTime: new Date(data.data.start).toISOString(),
              messageOfLead: "",
              calendarType: CALENDAR_TYPE.CAL,
              meetingSource: MEETING_SOURCE.PLATFORM,
              meetingUrl: data.data.meetingUrl || "",
            },
          });
        }
        // send event to automation
        await triggerAutomation({
          automations: Automations,
          event: AUTOMATION_EVENT.MEETING_UPDATED,
          data: { meeting: existingMeeting, updatedMeeting },
        });
        await triggerAutomation({
          automations: Automations,
          event: AUTOMATION_EVENT.MEETING_EVENTS,
          data: { meeting: existingMeeting, updatedMeeting },
        });
      });
    }

    return `Appointment cancelled successfully. Booking ID: ${data.data.id}, Booking URL: ${data.data.meetingUrl}, **rescheduleOrCancelId: ${data.data.uid}**`;
  } catch (err) {
    if (err instanceof AxiosError) {
      console.log({ err: JSON.stringify(err.response?.data) });
    }
    return "Appointment cancellation failed, get user's upcoming appointments";
  }
};

type GetCalBookingsInput = {
  args: GetCalBookingsRequest;
  calendar: CalenderIntegration;
  lead: LeadWithBizz;
  email: string;
};
export const getCalBookings = async ({
  args,
  calendar,
  email,
  lead,
}: GetCalBookingsInput) => {
  if (!lead) return;
  const { id, agencyId, businessId } = lead;
  const { calApiKey } = calendar;
  const res = await axios.get<GetCalBookingsResponse>(
    `https://api.cal.com/v2/bookings?attendeeEmail=${email}&status=upcoming&take=100`,
    {
      headers: {
        "cal-api-version": "2024-08-13",
        Authorization: `Bearer ${calApiKey}`,
      },
    }
  );
  const data = res.data; // for @db
  // format the string response for AI - also include the booking 'uid'
  let formattedResponse = "";
  let index = 1;
  if (data.data.length > 0) {
    for (const booking of data.data) {
      if (index === 0) {
        formattedResponse += `Here are your upcoming meetings: \n\n`;
      }
      formattedResponse += `Booking ${index + 1}:\n 
      **rescheduleOrCancelId: ${booking.uid}**,
      Title: ${booking.title},
      Start: ${formatInTimeZone(
        new Date(booking.start),
        lead.ianaTimezone,
        "dd MMM yyyy, hh:mm a"
      )},
      End: ${formatInTimeZone(
        new Date(booking.end),
        lead.ianaTimezone,
        "dd MMM yyyy, hh:mm a"
      )},
      Status: ${booking.status} 
      TZ: ${lead.ianaTimezone}
      --------------------------------- \n`;
      index++;
    }
  } else {
    formattedResponse = "No upcoming appointments found";
  }

  // create a system message
  const conversationId = lead.Conversation?.id;
  if (conversationId) {
    await prisma.conversationMessage.create({
      data: {
        content: "Get upcoming appointments",
        sender: MESSAGE_SENDER.SYSTEM,
        businessId: businessId,
        agencyId: agencyId,
        leadId: id,
        conversationId,
        // system fields
        systemEvent: SYSTEM_EVENT.GET_APPOINTMENTS,
        systemDescription: `Fetched upcoming appointments`,
        systemData: {
          input: {
            ...args,
          },
          output: {
            formattedResponse,
            raw: data,
          },
        },
      },
    });
  }
  return formattedResponse;
};
