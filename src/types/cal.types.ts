export type TimeSlot = {
  start: string;
  end: string;
};

export type AvailabilityData = {
  data: {
    // "2025-07-02" - per day slots
    [key: string]: TimeSlot[];
  };
  status: string; // success or error
};
