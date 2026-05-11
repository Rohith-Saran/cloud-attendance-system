import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import authOptions from "~/lib/auth";

export default async function DashboardHomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/signin");

  const role = String((session.user as any).role ?? "student");
  if (role === "admin") redirect("/dashboard/admin");
  if (role === "teacher") redirect("/dashboard/teacher");

  redirect("/dashboard/student");
}
