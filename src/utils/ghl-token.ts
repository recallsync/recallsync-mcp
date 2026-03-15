import { prisma } from "../lib/prisma.js";
import { GHLProviderConfig } from "../schema/recall.schema.js";

type RefreshGHLTokenProps = {
  providerId: string;
  refreshToken: string;
  currentConfig: GHLProviderConfig;
};

export const refreshGHLToken = async ({
  providerId,
  refreshToken,
  currentConfig,
}: RefreshGHLTokenProps): Promise<string> => {
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GHL_CLIENT_ID and GHL_CLIENT_SECRET must be configured");
  }

  const response = await fetch(
    "https://services.leadconnectorhq.com/oauth/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to refresh GHL token: ${response.status} ${JSON.stringify(errorData)}`
    );
  }

  const tokenData = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  if (!tokenData.access_token || !tokenData.refresh_token) {
    throw new Error("Invalid token response from GHL API");
  }

  await prisma.provider.update({
    where: { id: providerId },
    data: {
      config: {
        ...currentConfig,
        ghlAccessToken: tokenData.access_token,
        ghlRefreshToken: tokenData.refresh_token,
        ghlTokenExpiry: new Date(
          Date.now() + tokenData.expires_in * 1000
        ).toISOString(),
      },
    },
  });

  console.log(`GHL token refreshed successfully for provider ${providerId}`);
  return tokenData.access_token;
};
