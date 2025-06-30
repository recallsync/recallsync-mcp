import { Request, Response, NextFunction } from "express";

export interface GHLAccessTokenRequest extends Request {
  ghlacessToken?: string;
}

export function ghlAccessTokenMiddleware(
  req: GHLAccessTokenRequest,
  res: Response,
  next: NextFunction
) {
  const token =
    req.headers["ghlaccesstoken"] ||
    req.headers["ghl-access-token"] ||
    req.headers["ghl_access_token"];
  if (typeof token === "string") {
    req.ghlacessToken = token;
  } else if (Array.isArray(token)) {
    req.ghlacessToken = token[0];
  }
  next();
}
