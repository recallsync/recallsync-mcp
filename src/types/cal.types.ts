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

export type BookAppointmentInput = {
  eventTypeId: number;
  start: string;
  metadata: {
    source: string;
  };
  attendee: {
    email: string;
    name: string;
    timeZone: string;
  };
  bookingFieldsResponses: {
    title: string;
  };
};
export type BookAppointmentResponse = {
  status: "success";
  data: {
    id: number;
    uid: string;
    title: string;
    description: string;
    hosts: {
      id: number;
      name: string;
      email: string;
      username: string;
      timeZone: string;
    }[];
    status: "accepted" | "pending" | "cancelled" | "no_show";
    start: string;
    end: string;
    duration: number;
    eventTypeId: number;
    eventType: {
      id: number;
      slug: string;
    };
    meetingUrl: string;
    location: string;
    absentHost: boolean;
    createdAt: string;
    updatedAt: string;
    metadata: {
      source: string;
    };
    icsUid: string;
    attendees: {
      name: string;
      email: string;
      timeZone: string;
      language: string;
      absent: boolean;
    }[];
    bookingFieldsResponses: {
      email: string;
      name: string;
      title: string;
      rescheduledReason?: string; // when rescheduled
    };
  };
};

export type CalBooking = {
  id: number;
  uid: string;
  title: string;
  description: string;
  hosts: [
    {
      id: number;
      name: string;
      email: string;
      username: string;
      timeZone: string;
    }
  ];
  status: "accepted" | "pending" | "cancelled" | "no_show";
  start: string;
  end: string;
  duration: number;
  eventTypeId: number;
  eventType: {
    id: number;
    slug: string;
  };
  meetingUrl: string;
  location: string;
  absentHost: boolean;
  createdAt: string;
  updatedAt: string;
  metadata: {
    source: string;
  };
  rating: number | null;
  icsUid: string;
  attendees: [
    {
      name: string;
      email: string;
      timeZone: string;
      language: string;
      absent: boolean;
    }
  ];
  bookingFieldsResponses: {
    email: string;
    name: string;
    title: string;
  };
};
export type GetCalBookingsResponse = {
  status: "success" | "error";
  data: CalBooking[];
  pagination: {
    returnedItems: number;
    totalItems: number;
    itemsPerPage: number;
    remainingItems: number;
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};
