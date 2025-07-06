import axios from "axios";
import { Automation, AUTOMATION_EVENT } from "../generated/client/index.js";
import { prisma } from "../lib/prisma.js";

export const getLeadById = async (id: string) => {
  const lead = await prisma.lead.findUnique({
    where: {
      id: id,
    },
    include: {
      Business: {
        include: {
          Automations: true,
          BusinessIntegration: true,
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

type TriggerAutomationInput = {
  automations: Automation[];
  event: AUTOMATION_EVENT;
  data: any;
};
export const triggerAutomation = async ({
  automations,
  event,
  data,
}: TriggerAutomationInput) => {
  const automation = automations.find(
    (automation) => automation.event === event
  );
  if (!automation) return;
  await sendEventToAutomation(automation, event, data);
};

export const sendEventToAutomation = async (
  automation: Automation | null | undefined,
  type: AUTOMATION_EVENT,
  data: any
) => {
  if (!automation) return;
  const event = {
    type,
    data: data,
  };
  if (!automation.isActive) return;
  try {
    await axios.post(automation.url, event, {
      headers: {
        Authorization: `${automation.token}`,
      },
    });
  } catch (err: any) {
    console.log("Error sending event", { err: err.response });
  }
};
