import {
  DEFAULT_PERMISSION_CATALOG,
  DEFAULT_PERMISSION_NAMES,
  DEFAULT_STAFF_PERMISSION_NAMES,
  DEFAULT_VIEWER_PERMISSION_NAMES,
} from "./permission-catalog";

describe("DEFAULT_PERMISSION_CATALOG", () => {
  it("contains one entry per permission name", () => {
    expect(new Set(DEFAULT_PERMISSION_NAMES).size).toBe(
      DEFAULT_PERMISSION_CATALOG.length,
    );
  });

  it("keeps every document request permission used by the application", () => {
    expect(DEFAULT_PERMISSION_NAMES).toEqual(
      expect.arrayContaining([
        "document-requests.view",
        "document-requests.view-own",
        "document-requests.create",
        "document-requests.edit",
        "document-requests.submit",
        "document-requests.review",
        "document-requests.request-revision",
        "document-requests.reject",
        "document-requests.delete",
        "document-requests.approve-noted-by",
        "document-requests.approve-plant-manager",
        "document-requests.approve-document-controller",
        "document-requests.approve-hardcopy",
        "document-requests.complete",
      ]),
    );
  });

  it("catalogs the document assistant permission used by the API and UI", () => {
    expect(DEFAULT_PERMISSION_NAMES).toContain("ai-document-assistant.search");
  });

  it("catalogs staff self-service document access requests", () => {
    expect(DEFAULT_STAFF_PERMISSION_NAMES).toEqual(
      expect.arrayContaining([
        "document-access-requests.catalog",
        "document-access-requests.create",
        "document-access-requests.view-own",
        "document-access-requests.cancel-own",
      ]),
    );
    expect(DEFAULT_PERMISSION_NAMES).toEqual(
      expect.arrayContaining([
        "document-access-requests.review",
        "document-access-requests.approve",
        "document-access-requests.reject",
      ]),
    );
  });

  it("catalogs dedicated hardcopy transfer permissions", () => {
    expect(DEFAULT_PERMISSION_NAMES).toEqual(
      expect.arrayContaining([
        "hardcopy-transfers.view-own",
        "hardcopy-transfers.create",
        "hardcopy-transfers.review",
        "hardcopy-transfers.approve",
        "hardcopy-transfers.dispatch",
        "hardcopy-transfers.accept",
      ]),
    );
  });

  it("keeps Viewer strictly read-only", () => {
    expect(DEFAULT_VIEWER_PERMISSION_NAMES).toEqual([
      "dashboard.view",
      "documents.view",
      "softcopy-folders.view",
    ]);
    expect(DEFAULT_VIEWER_PERMISSION_NAMES.every((name) => name.endsWith(".view"))).toBe(true);
  });

  it("keeps every default role grant in the permission catalog", () => {
    expect([...DEFAULT_VIEWER_PERMISSION_NAMES, ...DEFAULT_STAFF_PERMISSION_NAMES].every((name) => DEFAULT_PERMISSION_NAMES.includes(name))).toBe(true);
  });

  it("does not expose the obsolete broad document approval permission", () => {
    expect(DEFAULT_PERMISSION_NAMES).not.toContain("document-requests.approve");
  });
});
