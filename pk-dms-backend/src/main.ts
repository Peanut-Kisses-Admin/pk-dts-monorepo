import { ValidationPipe, VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { existsSync, mkdirSync } from "fs";
import * as express from "express";
import { LocationsService } from "./api/v1/locations/locations.service";
import { DocumentsService } from "./api/v1/documents/documents.service";
import { AppModule } from "./app.module";
import { BigIntInterceptor } from "./common/interceptors/big-int.interceptor";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { uploadsRoot } from "./config/upload-paths";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  if (!existsSync(uploadsRoot)) {
    mkdirSync(uploadsRoot, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsRoot));
  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new BigIntInterceptor(), new ResponseInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Document Tracking System API")
    .setDescription(
      "Versioned API for document tracking, revisions, and uploads.",
    )
    .setVersion("1.0")
    .addTag("Auth")
    .addTag("Health")
    .addTag("Users")
    .addTag("Roles")
    .addTag("Permissions")
    .addTag("Role Permissions")
    .addTag("Areas")
    .addTag("Specifics")
    .addTag("Locations")
    .addTag("Sequences")
    .addTag("Softcopy Folders")
    .addTag("Documents")
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, swaggerDocument);

  await app.get(LocationsService).bootstrapLocationCodes();
  await app.get(DocumentsService).organizeRevisionStorage();

  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || "0.0.0.0";
  await app.listen(port, host);
}

bootstrap();
