import { AuthenticationError, MalformedResponseError } from "../../domain/errors.js";
import type { HttpClient } from "../../infrastructure/http/http-client.js";
import type { Clock } from "../../infrastructure/time/clock.js";
import { upsErrorSchema, upsTokenResponseSchema } from "./ups-schemas.js";

interface CachedToken {
  accessToken: string;
  expiresAtMs: number;
}

export interface UpsAuthConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  oauthPath: string;
  timeoutMs: number;
  tokenExpirySkewMs: number;
}

export class UpsAuthService {
  private cachedToken?: CachedToken;

  public constructor(
    private readonly config: UpsAuthConfig,
    private readonly httpClient: HttpClient,
    private readonly clock: Clock
  ) {}

  public async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAtMs > this.clock.now()) {
      return this.cachedToken.accessToken;
    }

    const authorization = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString("base64");

    const response = await this.httpClient.send({
      method: "POST",
      url: new URL(this.config.oauthPath, this.config.baseUrl).toString(),
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials",
      timeoutMs: this.config.timeoutMs
    });

    if (response.status >= 400) {
      throw new AuthenticationError(
        "UPS authentication failed.",
        response.status,
        this.parseErrorBody(response.bodyText)
      );
    }

    const tokenResponse = this.parseJson(response.bodyText);
    const parsedToken = upsTokenResponseSchema.safeParse(tokenResponse);

    if (!parsedToken.success) {
      throw new MalformedResponseError("UPS auth response did not match the expected schema.", {
        issues: parsedToken.error.issues
      });
    }

    this.cachedToken = {
      accessToken: parsedToken.data.access_token,
      expiresAtMs:
        this.clock.now() +
        parsedToken.data.expires_in * 1000 -
        this.config.tokenExpirySkewMs
    };

    return this.cachedToken.accessToken;
  }

  private parseJson(bodyText: string): unknown {
    try {
      return JSON.parse(bodyText);
    } catch (error) {
      throw new MalformedResponseError("UPS auth response returned invalid JSON.", {
        bodyText,
        cause: error
      });
    }
  }

  private parseErrorBody(bodyText: string): unknown {
    try {
      const parsed = JSON.parse(bodyText);
      const result = upsErrorSchema.safeParse(parsed);
      return result.success ? result.data : parsed;
    } catch {
      return { rawBody: bodyText };
    }
  }
}
