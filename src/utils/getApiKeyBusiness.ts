// Get Agency from token

import { PrismaClient } from "@prisma/client";
import { Request } from "express";

export const getAPIKeyBusiness = async (
  api_token: string,
  prisma: PrismaClient
) => {
  //   const api_token = req.headers["api_token"] as string;
  if (!api_token) {
    throw new Error("UNAUTHORIZEDsdfsd");
  }
  const apiKey = await prisma.apiKey.findUnique({
    where: { id: "07d26cda-6999-4dfe-95a3-0a112b7ff08c" },
    include: {
      Business: {
        include: {
          Automations: true,
          BusinessConfig: true,
        },
      },
      Agency: {
        select: {
          planIsActive: true,
        },
      },
    },
  });
  if (!apiKey) {
    throw new Error("UNAUTHORIZED");
  }

  return apiKey;
};
