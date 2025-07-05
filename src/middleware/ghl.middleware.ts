import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "../generated/client/index.js";
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
    const business = await getAPIKeyBusiness(api_token);
    const ghlToken = business?.Business?.BusinessIntegration?.ghlAccessToken;
    req.ghlAccessToken = typeof ghlToken === "string" ? ghlToken : undefined;
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
};
