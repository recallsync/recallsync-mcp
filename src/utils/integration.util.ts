import { prisma } from "../lib/prisma.js";

export const getLeadById = async (id: string) => {
  const lead = await prisma.lead.findUnique({
    where: {
      id: id,
    },
    include: {
      Business: {
        include: {
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
