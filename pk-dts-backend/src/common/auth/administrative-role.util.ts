const ADMINISTRATIVE_ROLE_NAMES = new Set([
  "admin",
  "administrator",
  "super admin",
  "superadmin",
  "super-admin",
]);

export function isAdministrativeRole(roleName: string | null | undefined) {
  return ADMINISTRATIVE_ROLE_NAMES.has(roleName?.trim().toLowerCase() ?? "");
}
