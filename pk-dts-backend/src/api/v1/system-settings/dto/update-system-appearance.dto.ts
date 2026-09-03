import { IsIn, IsObject, IsOptional } from "class-validator";

export const COLOR_THEMES = [
  "default",
  "crimson",
  "monochrome",
  "ocean",
  "emerald",
  "violet",
  "amber",
  "teal",
  "rose",
  "indigo",
] as const;

export class UpdateSystemAppearanceDto {
  @IsIn(["shared", "device"])
  themeScope: "shared" | "device";

  @IsIn(["light", "dark"])
  colorMode: "light" | "dark";

  @IsIn(COLOR_THEMES)
  colorTheme: (typeof COLOR_THEMES)[number];

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
