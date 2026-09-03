import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { UpdateSystemAppearanceDto } from "./dto/update-system-appearance.dto";
import { Prisma } from "@prisma/client";

const DEFAULT_APPEARANCE: UpdateSystemAppearanceDto = {
  themeScope: "device",
  colorMode: "light",
  colorTheme: "default",
};

@Injectable()
export class SystemSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAppearance() {
    const settings = await this.prisma.systemAppearanceSetting.findUnique({
      where: { id: 1 },
    });

    return settings
      ? {
          ...(this.asSettingsObject(settings.settings_json)),
          themeScope: settings.theme_scope as "shared" | "device",
          colorMode: settings.color_mode as "light" | "dark",
          colorTheme: settings.color_theme,
        }
      : DEFAULT_APPEARANCE;
  }

  async updateAppearance(dto: UpdateSystemAppearanceDto) {
    const settings = await this.prisma.systemAppearanceSetting.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        theme_scope: dto.themeScope,
        color_mode: dto.colorMode,
        color_theme: dto.colorTheme,
        settings_json: this.settingsPayload(dto),
      },
      update: {
        theme_scope: dto.themeScope,
        color_mode: dto.colorMode,
        color_theme: dto.colorTheme,
        settings_json: this.settingsPayload(dto),
      },
    });

    return {
      ...this.asSettingsObject(settings.settings_json),
      themeScope: settings.theme_scope as "shared" | "device",
      colorMode: settings.color_mode as "light" | "dark",
      colorTheme: settings.color_theme,
    };
  }

  private settingsPayload(dto: UpdateSystemAppearanceDto): Prisma.InputJsonObject {
    return {
      ...(dto.settings || {}),
      themeScope: dto.themeScope,
      colorMode: dto.colorMode,
      colorTheme: dto.colorTheme,
    } as Prisma.InputJsonObject;
  }

  private asSettingsObject(value: Prisma.JsonValue | null): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }
}
