import { isAdministrativeRole } from "./administrative-role.util";

describe("isAdministrativeRole", () => {
  it.each([
    "Admin",
    "Administrator",
    "Super Admin",
    "SuperAdmin",
    "Super-Admin",
    "  super admin  ",
  ])("recognizes administrative alias %s", (roleName) => {
    expect(isAdministrativeRole(roleName)).toBe(true);
  });

  it.each(["User", "Records Officer", "", undefined])(
    "does not treat %s as administrative",
    (roleName) => {
      expect(isAdministrativeRole(roleName)).toBe(false);
    },
  );
});
