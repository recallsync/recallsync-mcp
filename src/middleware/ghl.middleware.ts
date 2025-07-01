import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { getAPIKeyBusiness } from "../utils/ghl.js";

const prisma = new PrismaClient();

export interface GHLTokenRequest extends Request {
  ghlAccessToken?: string;
  ghlCalendarId?: string;
}

export const ghlMiddleware = async (
  req: GHLTokenRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const api_token = req.headers["api_key"] as string;
    const business = await getAPIKeyBusiness(api_token, prisma);
    const ghlToken = business?.Business?.BusinessIntegration?.ghlAccessToken;
    const ghlCalendarId = business?.Business?.PrimaryAgents?.[0]?.ghlCalendarId;
    req.ghlAccessToken = typeof ghlToken === "string" ? ghlToken : undefined;
    req.ghlCalendarId =
      typeof ghlCalendarId === "string" ? ghlCalendarId : undefined;
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
};
