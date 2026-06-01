export type AttendanceStatus = "P" | "A" | "L";

export type AttendanceMethod = "bulk" | "wifi-auto" | "qr-scan";

export type AttendanceRecord = {
  classId: string;
  sortKey: string;
  datestudentId?: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  method?: AttendanceMethod;
  markedAt?: string;
};
