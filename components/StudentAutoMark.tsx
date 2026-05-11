"use client";

import { useSession } from "next-auth/react";
import AutoMarkPing from "~/components/AutoMarkPing";

export default function StudentAutoMark() {
  const { data } = useSession();
  const classId = String((data?.user as any)?.classId ?? "class-a");
  return <AutoMarkPing classId={classId} />;
}
