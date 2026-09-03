import { Module } from "@nestjs/common";
import { SessionTokenService } from "../../../common/auth/session-token.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionTokenService],
})
export class AuthModule {}
