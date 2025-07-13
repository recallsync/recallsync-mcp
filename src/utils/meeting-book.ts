import { AUTOMATION_EVENT, Lead } from "../generated/client/index.js";
import {
  Automation,
  CALENDAR_TYPE,
  MEETING_SOURCE,
  MEETING_STATUS,
} from "../generated/client/index.js";
import { prisma } from "../lib/prisma.js";
import { triggerAutomation } from "./integration.util.js";
import { BookAppointmentResponse } from "../types/cal.types.js";
import { GHLAppointment } from "../types/ghl.types.js";

interface BookMeetingInput {
  businessId?: string;
  meetingId: string;
  startTime: Date | string;
  leadId: string;
  agencyId: string;
  caledarType: CALENDAR_TYPE;
  meetingSource: MEETING_SOURCE;
  status: MEETING_STATUS;
  meetingUrl?: string;
  automations: Automation[];
  transaction?: any;
  leadFieldsToUpdate?: Partial<Record<keyof Lead, string>>;
  createdAt?: Date;
  updatedAt?: Date;
}

export const bookMeeting = async ({
  businessId,
  startTime,
  leadId,
  agencyId,
  meetingId,
  caledarType,
  meetingSource,
  status,
  meetingUrl,
  automations,
  transaction = prisma,
  leadFieldsToUpdate,
  createdAt,
  updatedAt,
}: BookMeetingInput) => {
  try {
    const data = await transaction.meeting.create({
      data: {
        meetingId: meetingId,
        businessId: businessId || "",
        agencyId: agencyId,
        leadId,
        status: status,
        startTime: new Date(startTime).toISOString(),
        messageOfLead: "",
        calendarType: caledarType,
        meetingSource: meetingSource,
        meetingUrl,
        createdAt: createdAt || new Date(),
        updatedAt: updatedAt || new Date(),
      },
    });

    // update contact fields
    const fields = leadFieldsToUpdate;
    if (fields) {
      await transaction.lead.update({
        where: { id: leadId },
        data: fields,
      });
    }

    // send event to automation
    await triggerAutomation({
      automations,
      event: AUTOMATION_EVENT.MEETING_CREATED,
      data: { meeting: data },
    });
    await triggerAutomation({
      automations,
      event: AUTOMATION_EVENT.MEETING_EVENTS,
      data: { meeting: data },
    });
    return {
      success: true,
      data: data,
    };
  } catch (err) {
    console.log("error booking appointment");
    console.log({ err: (err as Error)?.message });
    return {
      success: false,
      data: null,
    };
  }
};

interface UpdateMeetingInput {
  meetingId: string;
  newStartTime?: Date;
  status: MEETING_STATUS;
  transaction?: any;
}
export const updateMeeting = async ({
  meetingId,
  newStartTime,
  status,
  transaction = prisma,
}: UpdateMeetingInput) => {
  console.log("update meeting", { meetingId, newStartTime, status });
  try {
    const payload = newStartTime
      ? {
          status: status,
          startTime: new Date(newStartTime).toISOString(),
          updatedAt: new Date(),
        }
      : {
          status: status,
          updatedAt: new Date(),
        };

    const data = await transaction.meeting.update({
      where: {
        meetingId: meetingId,
      },

      data: {
        ...payload,
      },
    });
    return {
      success: true,
      data: data,
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
