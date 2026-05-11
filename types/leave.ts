export type LeaveStatus = "pending" | "approved" | "rejected";

export type LeaveRequest = {
  leaveId: string;
  studentId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveStatus;
};
