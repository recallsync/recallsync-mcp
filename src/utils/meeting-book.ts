import { CALENDAR_TYPE, MEETING_SOURCE, MEETING_STATUS } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

interface BookMeetingInput {
  businessId?: string;
  meetingId: string;
  startTime: Date | string;
  contactId: string;
  agencyId: string;
  caledarType: CALENDAR_TYPE;
  meetingSource: MEETING_SOURCE;
  status: MEETING_STATUS;
  meetingUrl?: string;
}
interface UpdateMeetingInput {
  meetingId: string;
  newStartTime?: Date;
  status: MEETING_STATUS;
}
export const bookMeeting = async ({
  businessId,
  startTime,
  contactId,
  agencyId,
  meetingId,
  caledarType,
  meetingSource,
  status,
  meetingUrl,
}: BookMeetingInput) => {
  try {
    console.log("book meeting", startTime);
    const response = await prisma?.meeting.create({
      data: {
        id: meetingId,
        businessId: businessId || "",
        agencyId: agencyId,
        leadId: contactId,
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
}: UpdateMeetingInput) => {
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

    const response = await prisma?.meeting.update({
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
