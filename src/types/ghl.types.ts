export type GHLAppointment = {
  appointmentStatus: GHLAppointmentStatus;
  assignedUserId: string;
  address: string;
  calendarId: string;
  contactId: string;
  dateAdded: string;
  dateUpdated: string;
  endTime: string;
  id: string;
  locationId: string;
  startTime: string;
  title: string;
};

export type GetGHLAppointmentsResponse = {
  events: GHLAppointment[];
  traceId: string;
};

export type GHLAppointmentStatus =
  | "new"
  | "confirmed"
  | "cancelled"
  | "showed"
  | "noshow"
  | "invalid";
