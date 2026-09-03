import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";

interface SessionTokenPayload {
  sub: string;
  exp: number;
}

@Injectable()
export class SessionTokenService {
  private readonly sessionTtlSeconds = Number(
    process.env.AUTH_SESSION_TTL_SECONDS ?? 60 * 60 * 12,
  );

  createToken(userId: bigint) {
    const payload: SessionTokenPayload = {
      sub: userId.toString(),
      exp: Math.floor(Date.now() / 1000) + this.sessionTtlSeconds,
    };

    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signature = this.sign(encodedPayload);
    return `${encodedPayload}.${signature}`;
  }

  verifyToken(token: string) {
    const [encodedPayload, providedSignature] = token.split(".");

    if (!encodedPayload || !providedSignature) {
      throw new UnauthorizedException("Invalid session token.");
    }

    const expectedSignature = this.sign(encodedPayload);
    const providedBuffer = Buffer.from(providedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException("Invalid session token signature.");
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SessionTokenPayload;

    if (!payload.sub || !payload.exp) {
      throw new UnauthorizedException("Invalid session token payload.");
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException("Session token has expired.");
    }

    return payload;
  }

  private sign(value: string) {
    return createHmac("sha256", this.sessionSecret())
      .update(value)
      .digest("base64url");
  }

  private base64UrlEncode(value: string) {
    return Buffer.from(value, "utf8").toString("base64url");
  }

  private sessionSecret() {
    return (
      process.env.AUTH_SESSION_SECRET?.trim() ||
      process.env.APP_SECRET?.trim() ||
      "document-tracking-dev-secret"
    );
  }
}
