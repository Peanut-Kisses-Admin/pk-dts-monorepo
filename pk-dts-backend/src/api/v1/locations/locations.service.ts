import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  locationCodeToNumeric,
  nextLocationCode,
  numericToLocationCode,
} from "../../../common/utils/location-code.util";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { toBigIntId } from "../../../common/utils/prisma-id.util";
import {
  getPagination,
  paginatedResponse,
} from "../../../common/utils/pagination.util";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";

@Injectable()
export class LocationsService {
  private readonly locationCodeSequenceKey = "location_code";

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.location.findMany({
        skip,
        take,
        include: { specific: { include: { area: true } }, asset: { include: { specific: { include: { area: true } } } } },
        orderBy: [{ location_code: "asc" }, { location_name: "asc" }],
      }),
      this.prisma.location.count(),
    ]);

    return paginatedResponse(items, total, page, limit);
  }

  findOne(id: string) {
    return this.prisma.location.findUnique({
      where: { location_id: toBigIntId(id, "location_id") },
      include: { hardcopies: true, specific: { include: { area: true } }, asset: { include: { specific: { include: { area: true } } } } },
    });
  }

  async create(dto: CreateLocationDto) {
    const normalizedName = dto.location_name.trim();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const selectedAsset = dto.asset_id
            ? await tx.assetNumber.findUnique({ where: { asset_id: toBigIntId(dto.asset_id, "asset_id") }, select: { specific_id: true } })
            : null;
          const specificId = selectedAsset?.specific_id ?? (dto.specific_id ? toBigIntId(dto.specific_id, "specific_id") : null);
          if (!specificId) throw new BadRequestException("Assign the location to a specific or select an asset number with a specific.");
          const existingLocationCount = await tx.location.count();
          await tx.systemSequenceState.upsert({
            where: { sequence_key: this.locationCodeSequenceKey },
            update: {},
            create: {
              sequence_key: this.locationCodeSequenceKey,
              next_value: BigInt(existingLocationCount),
            },
          });

          const sequenceState = await tx.systemSequenceState.update({
            where: { sequence_key: this.locationCodeSequenceKey },
            data: { next_value: { increment: 1n } },
            select: { next_value: true },
          });

          return tx.location.create({
            data: {
              location_name: normalizedName,
              location_code: numericToLocationCode(
                Number(sequenceState.next_value),
              ),
              ...(dto.asset_id ? { asset_id: toBigIntId(dto.asset_id, "asset_id") } : {}),
              specific_id: specificId,
            },
          });
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          continue;
        }

        this.handleLocationWriteError(error);
      }
    }

    throw new ConflictException(
      "A unique Location Code could not be generated. Please try again.",
    );
  }

  update(id: string, dto: UpdateLocationDto) {
    const locationId = toBigIntId(id, "location_id");
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.location.findUnique({ where: { location_id: locationId }, select: { specific_id: true } });
      if (!current) throw new NotFoundException("Location not found.");
      const selectedAsset = dto.asset_id
        ? await tx.assetNumber.findUnique({ where: { asset_id: toBigIntId(dto.asset_id, "asset_id") }, select: { specific_id: true } })
        : null;
      const specificId = selectedAsset?.specific_id ?? (dto.specific_id !== undefined ? (dto.specific_id ? toBigIntId(dto.specific_id, "specific_id") : null) : current.specific_id);
      if (!specificId) throw new BadRequestException("Assign the location to a specific or select an asset number with a specific.");
      const location = await tx.location.update({
        where: { location_id: locationId },
        data: {
          ...(dto.location_name !== undefined
            ? { location_name: dto.location_name.trim() }
            : {}),
          ...(dto.asset_id !== undefined
            ? { asset_id: dto.asset_id ? toBigIntId(dto.asset_id, "asset_id") : null }
            : {}),
          specific_id: specificId,
        },
        include: { specific: true, asset: { include: { specific: true } } },
      });

      const routeSpecific = location.asset?.specific ?? location.specific;
      if (routeSpecific?.area_id) {
        await tx.hardcopyDocument.updateMany({
          where: { location_id: locationId },
          data: {
            asset_id: location.asset_id,
            specific_id: routeSpecific.specific_id,
            area_id: routeSpecific.area_id,
          },
        });
      }

      return location;
    });
  }

  async remove(id: string) {
    const locationId = toBigIntId(id, "location_id");
    const location = await this.prisma.location.findUnique({
      where: { location_id: locationId },
      include: {
        hardcopies: {
          select: { hardcopy_id: true },
          take: 1,
        },
      },
    });

    if (!location) {
      throw new NotFoundException("Location not found.");
    }

    if (!location.is_active) {
      return location;
    }

    return this.prisma.location.update({
      where: { location_id: locationId },
      data: {
        is_active: false,
        archived_at: new Date(),
      },
    });
  }

  async bootstrapLocationCodes() {
    const locations = await this.prisma.location.findMany({
      orderBy: { location_id: "asc" },
    });

    if (!locations.length) {
      await this.prisma.systemSequenceState.upsert({
        where: { sequence_key: this.locationCodeSequenceKey },
        update: { next_value: 0n },
        create: { sequence_key: this.locationCodeSequenceKey, next_value: 0n },
      });
      return;
    }

    for (let index = 0; index < locations.length; index += 1) {
      const location = locations[index];
      const expectedCode =
        location.location_code ?? numericToLocationCode(index + 1);

      if (location.location_code !== expectedCode) {
        await this.prisma.location.update({
          where: { location_id: location.location_id },
          data: { location_code: expectedCode },
        });
      }
    }

    const highestCode = locations
      .map(
        (location, index) =>
          location.location_code ?? numericToLocationCode(index + 1),
      )
      .reduce(
        (highest, code) =>
          locationCodeToNumeric(code) > locationCodeToNumeric(highest)
            ? code
            : highest,
        locations[0].location_code ?? numericToLocationCode(1),
      );

    await this.prisma.systemSequenceState.upsert({
      where: { sequence_key: this.locationCodeSequenceKey },
      update: { next_value: BigInt(locationCodeToNumeric(highestCode)) },
      create: {
        sequence_key: this.locationCodeSequenceKey,
        next_value: BigInt(locationCodeToNumeric(highestCode)),
      },
    });
  }

  private handleLocationWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException(
        "A location with this name or Location Code already exists.",
      );
    }

    throw error;
  }
}
