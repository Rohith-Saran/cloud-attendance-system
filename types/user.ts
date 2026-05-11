export type Role = "admin" | "teacher" | "student";

export type AppUser = {
  userId: string;
  email: string;
  name: string;
  role: Role;
  classId?: string;
  deptId?: string;
};
