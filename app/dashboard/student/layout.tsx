import StudentAutoMark from "~/components/StudentAutoMark";
import type { ReactNode } from "react";

export default function StudentSegmentLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <StudentAutoMark />
      {children}
    </>
  );
}
