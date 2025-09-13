import axios from "axios";
import { Event, EVENT } from "../generated/client/index.js";
import { prisma } from "../lib/prisma.js";

export const getLeadById = async (id: string) => {
  const lead = await prisma.lead.findUnique({
    where: {
      id: id,
    },
    include: {
      Business: {
        include: {
          Events: true,
          Providers: true,
        },
      },
      Conversation: {
        include: {
          ActiveAgent: {
            include: {
              CalenderIntegration: true,
            },
          },
        },
      },
    },
  });
  return lead;
};
export type LeadWithBizz = Awaited<ReturnType<typeof getLeadById>>;

export const getIntegration = async (apiKey: string) => {
  const integration = await prisma.apiKey.findUnique({
    where: {
      id: apiKey,
    },
    include: {
      Business: {
        include: {
          BusinessIntegration: true,
        },
      },
    },
  });

  return integration;
};

export const getPrimaryAgent = async (id: string) => {
  const primaryAgent = await prisma.primaryAgent.findUnique({
    where: {
      id: id,
    },
    include: {
      CalenderIntegration: true,
    },
  });
  return primaryAgent;
};

type TriggerEventInput = {
  events: Event[];
  event: EVENT;
  data: any;
};
export const triggerEvent = async ({
  events,
  event,
  data,
}: TriggerEventInput) => {
  const item = events.find((e) => e.event === event);
  if (!item) return;
  await sendEventToEvent(item, event, data);
};

export const sendEventToEvent = async (
  eventItem: Event | null | undefined,
  type: EVENT,
  data: any
) => {
  if (!eventItem) return;
  const event = {
    type,
    data: data,
  };
  if (!eventItem.isActive) return;
  try {
    await axios.post(eventItem.url, event, {
      headers: {
        Authorization: `${eventItem.token}`,
      },
    });
  } catch (err: any) {
    console.log("Error sending event", { err: err.message });
  }
};
