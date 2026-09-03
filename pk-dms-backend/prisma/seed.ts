import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { DEFAULT_PERMISSION_CATALOG, DEFAULT_STAFF_PERMISSION_NAMES, DEFAULT_VIEWER_PERMISSION_NAMES } from "../src/common/constants/permission-catalog";
import {
  locationCodeToNumeric,
  numericToLocationCode,
} from "../src/common/utils/location-code.util";

const prisma = new PrismaClient();

const DEFAULT_ADMIN_ROLE_NAME = "Admin";
const DEFAULT_ADMIN_EMAIL =
  process.env.DEFAULT_ADMIN_EMAIL?.trim().toLowerCase() ||
  "admin@document-tracking.com";
const DEFAULT_ADMIN_PASSWORD =
  process.env.DEFAULT_ADMIN_PASSWORD?.trim() || "admin123";
const DEFAULT_ADMIN_FIRSTNAME =
  process.env.DEFAULT_ADMIN_FIRSTNAME?.trim() || "Admin";
const DEFAULT_ADMIN_LASTNAME =
  process.env.DEFAULT_ADMIN_LASTNAME?.trim() || "User";

const DEFAULT_LOCATIONS = [
  "Production Archive",
  "QA Records Room",
  "HR Cabinet",
  "Maintenance Office",
] as const;

const LOCATION_CODE_SEQUENCE_KEY = "location_code";

async function main() {
  console.log("Starting database seed...");

  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

  const validPermissionNames = new Set(
    DEFAULT_PERMISSION_CATALOG.map((permission) => permission.permission_name),
  );

  const existingPermissions = await prisma.permission.findMany({
    select: { permission_id: true, permission_name: true },
  });

  const stalePermissionIds = existingPermissions
    .filter(
      (permission) => !validPermissionNames.has(permission.permission_name),
    )
    .map((permission) => permission.permission_id);

  if (stalePermissionIds.length) {
    await prisma.rolePermission.deleteMany({
      where: { permission_id: { in: stalePermissionIds } },
    });
    await prisma.permission.deleteMany({
      where: { permission_id: { in: stalePermissionIds } },
    });
  }

  const permissionRecords = await Promise.all(
    DEFAULT_PERMISSION_CATALOG.map((permission) =>
      prisma.permission.upsert({
        where: { permission_name: permission.permission_name },
        update: {
          module_key: permission.module_key,
          module_label: permission.module_label,
          action_key: permission.action_key,
          action_label: permission.action_label,
          description: permission.description,
        },
        create: permission,
      }),
    ),
  );

  const adminRole = await prisma.role.upsert({
    where: { role_name: DEFAULT_ADMIN_ROLE_NAME },
    update: {
      description:
        "Default system administrator role with access to all protected modules.",
    },
    create: {
      role_name: DEFAULT_ADMIN_ROLE_NAME,
      description:
        "Default system administrator role with access to all protected modules.",
    },
  });

  const staffRole = await prisma.role.upsert({
    where: { role_name: "Staff" },
    update: { description: "Staff users manage their own folders, requests, attachments, and documents." },
    create: { role_name: "Staff", description: "Staff users manage their own folders, requests, attachments, and documents." },
  });
  const viewerRole = await prisma.role.upsert({
    where: { role_name: "Viewer" },
    update: { description: "Read-only access to assigned documents and their folder hierarchy." },
    create: { role_name: "Viewer", description: "Read-only access to assigned documents and their folder hierarchy." },
  });
  for (const [role, permissionNames] of [
    [staffRole, DEFAULT_STAFF_PERMISSION_NAMES],
    [viewerRole, DEFAULT_VIEWER_PERMISSION_NAMES],
  ] as const) {
    const allowed = new Set<string>(permissionNames);
    const allowedPermissionIds = permissionRecords.filter((permission) => allowed.has(permission.permission_name)).map((permission) => permission.permission_id);
    await prisma.rolePermission.deleteMany({ where: { role_id: role.role_id, permission_id: { notIn: allowedPermissionIds } } });
    await Promise.all(permissionRecords.filter((permission) => allowed.has(permission.permission_name)).map((permission) => prisma.rolePermission.upsert({
      where: { role_id_permission_id: { role_id: role.role_id, permission_id: permission.permission_id } },
      update: {},
      create: { role_id: role.role_id, permission_id: permission.permission_id },
    })));
  }

  const hardcopyStorageLinks = await prisma.hardcopyDocument.findMany({
    where: { OR: [{ asset_id: { not: null } }, { specific_id: { not: null } }] },
    select: { asset_id: true, specific_id: true, location_id: true },
  });
  const specificByAsset = new Map<bigint, bigint>();
  const assetByLocation = new Map<bigint, bigint>();
  for (const link of hardcopyStorageLinks) {
    if (link.asset_id && link.specific_id && !specificByAsset.has(link.asset_id)) specificByAsset.set(link.asset_id, link.specific_id);
    if (link.asset_id && !assetByLocation.has(link.location_id)) assetByLocation.set(link.location_id, link.asset_id);
  }
  await Promise.all([
    ...Array.from(specificByAsset, ([asset_id, specific_id]) => prisma.assetNumber.updateMany({ where: { asset_id, specific_id: null }, data: { specific_id } })),
    ...Array.from(assetByLocation, ([location_id, asset_id]) => prisma.location.updateMany({ where: { location_id, asset_id: null }, data: { asset_id } })),
  ]);

  const searchPortalPermission = permissionRecords.find(
    (permission) => permission.permission_name === "admin-search-portal.access",
  );
  const administrativeRoles = await prisma.role.findMany({
    where: {
      role_name: {
        in: ["Admin", "Administrator", "Super Admin", "SuperAdmin", "Super-Admin"],
      },
    },
    select: { role_id: true },
  });

  if (searchPortalPermission) {
    await prisma.rolePermission.deleteMany({
      where: {
        permission_id: searchPortalPermission.permission_id,
        role_id: { notIn: administrativeRoles.map((role) => role.role_id) },
      },
    });
  }

  await Promise.all(
    administrativeRoles.flatMap((role) => permissionRecords.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          role_id_permission_id: {
            role_id: role.role_id,
            permission_id: permission.permission_id,
          },
        },
        update: {},
        create: {
          role_id: role.role_id,
          permission_id: permission.permission_id,
        },
      })),
    ),
  );

  const adminUser = await prisma.user.upsert({
    where: { email: DEFAULT_ADMIN_EMAIL },
    update: {
      firstname: DEFAULT_ADMIN_FIRSTNAME,
      lastname: DEFAULT_ADMIN_LASTNAME,
      position_title: "System Administrator",
      role_id: adminRole.role_id,
    },
    create: {
      firstname: DEFAULT_ADMIN_FIRSTNAME,
      lastname: DEFAULT_ADMIN_LASTNAME,
      email: DEFAULT_ADMIN_EMAIL,
      password: hashedPassword,
      position_title: "System Administrator",
      role_id: adminRole.role_id,
      require_password_change: true,
    },
  });

  void adminUser;

  await prisma.softcopyCategory.upsert({
    where: { folder_name: "uncategorized" },
    update: { is_active: true },
    create: {
      category_name: "Uncategorized",
      folder_name: "uncategorized",
      description: "Default category for existing and unclassified softcopy documents.",
    },
  });

  for (let index = 0; index < DEFAULT_LOCATIONS.length; index += 1) {
    const locationName = DEFAULT_LOCATIONS[index];
    const expectedCode = numericToLocationCode(index + 1);
    const existingLocation = await prisma.location.findUnique({
      where: { location_name: locationName },
    });

    if (!existingLocation) {
      await prisma.location.create({
        data: {
          location_name: locationName,
          location_code: expectedCode,
          is_active: true,
          archived_at: null,
        },
      });
      continue;
    }

    if (!existingLocation.location_code) {
      await prisma.location.update({
        where: { location_id: existingLocation.location_id },
        data: { location_code: expectedCode, is_active: true },
      });
    }
  }

  const allLocations = await prisma.location.findMany({
    orderBy: { location_id: "asc" },
  });

  for (let index = 0; index < allLocations.length; index += 1) {
    const location = allLocations[index];
    if (location.location_code) {
      continue;
    }

    await prisma.location.update({
      where: { location_id: location.location_id },
      data: { location_code: numericToLocationCode(index + 1) },
    });
  }

  const locationsWithCodes = await prisma.location.findMany({
    where: { location_code: { not: null } },
    select: { location_code: true },
  });

  const highestLocationCodeNumber = locationsWithCodes.reduce(
    (highest, location) =>
      Math.max(highest, locationCodeToNumeric(location.location_code!)),
    0,
  );

  await prisma.systemSequenceState.upsert({
    where: { sequence_key: LOCATION_CODE_SEQUENCE_KEY },
    update: { next_value: BigInt(highestLocationCodeNumber) },
    create: {
      sequence_key: LOCATION_CODE_SEQUENCE_KEY,
      next_value: BigInt(highestLocationCodeNumber),
    },
  });

  console.log("Database seed completed.");
  console.log(`Default admin email: ${DEFAULT_ADMIN_EMAIL}`);
  console.log(
    "The default admin account is seeded with require_password_change=true.",
  );
} 

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
