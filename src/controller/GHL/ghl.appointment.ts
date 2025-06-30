import { CheckAvailabilityRequest } from "../../schema/GHL/appointment.schema.js";

export const checkAvailability = async (input: CheckAvailabilityRequest) => {
  const { startTime, timezone } = input;

  return {
    slots: [
      {
        startTime: "2025-01-01T09:00:00Z",
        endTime: "2025-01-01T10:00:00Z",
      },
    ],
  };
};
