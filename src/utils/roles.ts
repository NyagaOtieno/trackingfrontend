export function isPrivileged(role: string) {
  return ["super_admin", "admin", "staff"].includes(
    (role || "").toLowerCase().trim()
  );
}