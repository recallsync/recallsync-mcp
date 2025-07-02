import { CALENDAR_TYPE, MEETING_SOURCE, MEETING_STATUS } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

interface BookMeetingInput {
  businessId?: string;
  meetingId: string;
  startTime: Date;
  contactId: string;
  agencyId: string;
  caledarType: CALENDAR_TYPE;
  meetingSource: MEETING_SOURCE;
  status: MEETING_STATUS;
}
interface UpdateMeetingInput {
  meetingId: string;
  newStartTime: Date;
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
}: BookMeetingInput) => {
  try {
    const response = await prisma?.meeting.create({
      data: {
        id: meetingId,
        businessId: businessId || "",
        agencyId: agencyId,
        leadId: contactId,
        status: status,
        startTime: new Date(startTime).toDateString(),
        updatedAt: new Date(),
        messageOfLead: "",
        calendarType: caledarType,
        meetingSource: meetingSource,
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
    const response = await prisma?.meeting.update({
      where: {
        id: meetingId,
      },
      data: {
        status: status,
        startTime: new Date(newStartTime).toDateString(),
        updatedAt: new Date(),
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
