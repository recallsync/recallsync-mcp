import {
  CALENDAR_TYPE,
  MEETING_SOURCE,
  MEETING_STATUS,
} from "../generated/client/index.js";
import { prisma } from "../lib/prisma.js";

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
  transaction?: any;
}
interface UpdateMeetingInput {
  meetingId: string;
  newStartTime?: Date;
  status: MEETING_STATUS;
  transaction?: any;
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
  transaction,
}: BookMeetingInput) => {
  try {
    console.log("book meeting", startTime);
    const dbClient = transaction || prisma;
    const response = await dbClient?.meeting.create({
      data: {
        id: meetingId,
        businessId: businessId || "",
        agencyId: agencyId,
        leadId,
        status: status,
        startTime: new Date(startTime).toISOString(),
        updatedAt: new Date(),
        messageOfLead: "",
        calendarType: caledarType,
        meetingSource: meetingSource,
        meetingUrl,
      },
    });
    return {
      success: true,
      data: response,
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
export const updateMeeting = async ({
  meetingId,
  newStartTime,
  status,
  transaction,
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

    const dbClient = transaction || prisma;
    const response = await dbClient?.meeting.update({
      where: {
        id: meetingId,
      },

      data: {
        ...payload,
      },
    });
    return {
      success: true,
      data: response,
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
