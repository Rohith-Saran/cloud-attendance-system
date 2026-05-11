import { rawClient } from "~/lib/aws/dynamodb";
import { ScanCommand } from "@aws-sdk/client-dynamodb";
import { sendEmail } from "~/lib/aws/ses";
import { publishSms } from "~/lib/aws/sns";

const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || "Users";
const ATTENDANCE_TABLE = process.env.DYNAMODB_ATTENDANCE_TABLE || "Attendance";

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

export async function handler(event: any) {
  // This lambda scans all students and computes attendance over last 30 days.
  const cutoff = daysAgoIso(30);

  // Scan Users table for students
  const scanUsersParams: any = {
    TableName: USERS_TABLE,
    FilterExpression: "#r = :role",
    ExpressionAttributeNames: { "#r": "role" },
    ExpressionAttributeValues: { ":role": "student" },
  };

  const usersResp: any = await rawClient.send(new ScanCommand(scanUsersParams)).catch((err) => {
    console.error("failed scanning users", err);
    return { Items: [] };
  });

  const students = usersResp.Items || [];

  for (const s of students) {
    const studentId = s.userId || s.studentId || s.email;
    if (!studentId) continue;

    // Scan Attendance table for this student within last 30 days (simple filter-based approach)
    const scanAttendanceParams: any = {
      TableName: ATTENDANCE_TABLE,
      FilterExpression: "studentId = :sid AND #d >= :cutoff",
      ExpressionAttributeNames: { "#d": "date" },
      ExpressionAttributeValues: { ":sid": studentId, ":cutoff": cutoff },
      ProjectionExpression: "studentId, date, status",
    };

    const attResp: any = await rawClient.send(new ScanCommand(scanAttendanceParams)).catch((err) => {
      console.error("failed scanning attendance for", studentId, err);
      return { Items: [] };
    });

    const rows = attResp.Items || [];
    const total = rows.length || 0;
    const present = rows.filter((r: any) => r.status === "P").length;
    const percent = total > 0 ? Math.round((present / total) * 100) : 0;

    if (percent < 75) {
      const email = s.parentEmail || s.email;
      const phone = s.parentPhone || s.phoneNumber || s.mobile;
      const subject = `Low Attendance Alert: ${s.name || studentId}`;
      const text = `Dear Parent/Student,\n\nAttendance for ${s.name || studentId} is ${percent}% in the last 30 days. Please take necessary action.\n\nRegards`;

      try {
        if (email) await sendEmail(email, subject, text);
      } catch (err) {
        console.error("failed sending email to", email, err);
      }

      try {
        if (phone) await publishSms(phone, `Attendance for ${s.name || studentId} is ${percent}% (30 days).`);
      } catch (err) {
        console.error("failed sending sms to", phone, err);
      }
    }
  }

  return { status: "done" };
}
