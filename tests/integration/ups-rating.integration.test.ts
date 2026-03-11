import { describe, expect, it } from "vitest";
import tokenSuccess from "../fixtures/ups/token-success.json" with { type: "json" };
import tokenRefresh from "../fixtures/ups/token-refresh.json" with { type: "json" };
import rateSuccess from "../fixtures/ups/rate-success.json" with { type: "json" };
import error401 from "../fixtures/ups/error-401.json" with { type: "json" };
import error429 from "../fixtures/ups/error-429.json" with { type: "json" };
import error500 from "../fixtures/ups/error-500.json" with { type: "json" };
import malformedRate from "../fixtures/ups/malformed-rate.json" with { type: "json" };
import { UpsCarrierClient } from "../../src/carriers/ups/ups-client.js";
import type { AppConfig } from "../../src/config/env.js";
import type { HttpClient, HttpRequest, HttpResponse } from "../../src/infrastructure/http/http-client.js";
import {
  AuthenticationError,
  HttpError,
  MalformedResponseError,
  RateLimitError,
  TimeoutError,
  ValidationError
} from "../../src/domain/errors.js";

// Fake clock lets the token lifecycle tests control expiry precisely.
class FakeClock {
  public currentMs = 1_700_000_000_000;

  public now(): number {
    return this.currentMs;
  }

  public advance(ms: number): void {
    this.currentMs += ms;
  }
}

type PlannedResponse =
  | { type: "response"; value: HttpResponse }
  | { type: "error"; value: Error };

class StubHttpClient implements HttpClient {
  public readonly requests: HttpRequest[] = [];

  public constructor(private readonly plannedResponses: PlannedResponse[]) {}

  public async send(request: HttpRequest): Promise<HttpResponse> {
    this.requests.push(request);

    const nextResponse = this.plannedResponses.shift();

    if (!nextResponse) {
      throw new Error("No stubbed response remaining.");
    }

    if (nextResponse.type === "error") {
      throw nextResponse.value;
    }

    return nextResponse.value;
  }
}

// Shared config keeps the test cases focused on behavior instead of setup noise.
const baseConfig: AppConfig = {
  UPS_CLIENT_ID: "client-id",
  UPS_CLIENT_SECRET: "client-secret",
  UPS_BASE_URL: "https://wwwcie.ups.com",
  UPS_OAUTH_PATH: "/security/v1/oauth/token",
  UPS_RATING_PATH: "/api/rating/v2403/Rate",
  REQUEST_TIMEOUT_MS: 5000,
  TOKEN_EXPIRY_SKEW_MS: 30000
};

const validRequest = {
  shipper: {
    name: "Warehouse A",
    addressLine1: "123 Origin St",
    city: "Atlanta",
    stateProvinceCode: "GA",
    postalCode: "30301",
    countryCode: "US"
  },
  recipient: {
    name: "Customer B",
    addressLine1: "987 Destination Ave",
    city: "Miami",
    stateProvinceCode: "FL",
    postalCode: "33101",
    countryCode: "US"
  },
  packages: [
    {
      packagingCode: "02",
      weight: {
        unit: "LBS" as const,
        value: 2
      },
      dimensions: {
        unit: "IN" as const,
        length: 10,
        width: 8,
        height: 4
      }
    }
  ]
};

function jsonResponse(status: number, body: unknown): HttpResponse {
  return {
    status,
    headers: {
      "content-type": "application/json"
    },
    bodyText: JSON.stringify(body)
  };
}

describe("UpsCarrierClient integration", () => {
  it("builds the auth request, builds the rating payload, and normalizes successful quotes", async () => {
    const httpClient = new StubHttpClient([
      { type: "response", value: jsonResponse(200, tokenSuccess) },
      { type: "response", value: jsonResponse(200, rateSuccess) }
    ]);
    const clock = new FakeClock();
    const client = new UpsCarrierClient(baseConfig, httpClient, clock);

    const quotes = await client.getRates(validRequest);

    expect(httpClient.requests).toHaveLength(2);
    expect(httpClient.requests[0]?.url).toBe("https://wwwcie.ups.com/security/v1/oauth/token");
    expect(httpClient.requests[0]?.headers?.Authorization).toContain("Basic ");
    expect(httpClient.requests[0]?.body).toBe("grant_type=client_credentials");
    expect(httpClient.requests[1]?.headers?.Authorization).toBe("Bearer ups-access-token");

    const ratingBody = JSON.parse(httpClient.requests[1]?.body ?? "{}");
    expect(ratingBody.RateRequest.Shipment.Shipper.Address.PostalCode).toBe("30301");
    expect(ratingBody.RateRequest.Shipment.ShipTo.Address.PostalCode).toBe("33101");
    expect(ratingBody.RateRequest.Shipment.Package[0].PackageWeight.Weight).toBe("2");
    expect(ratingBody.RateRequest.Shipment.Package[0].Dimensions.Length).toBe("10");

    expect(quotes).toEqual([
      {
        carrier: "ups",
        serviceCode: "03",
        serviceName: "UPS Ground",
        totalCharge: {
          currencyCode: "USD",
          amount: "14.25"
        },
        billingWeight: {
          unit: "LBS",
          value: "2"
        },
        estimatedDeliveryDate: "3",
        metadata: {
          deliveryByTime: "16:30:00"
        }
      },
      {
        carrier: "ups",
        serviceCode: "02",
        serviceName: "UPS 2nd Day Air",
        totalCharge: {
          currencyCode: "USD",
          amount: "31.10"
        },
        billingWeight: undefined,
        estimatedDeliveryDate: undefined,
        metadata: {}
      }
    ]);
  });

  it("reuses a valid cached token", async () => {
    const httpClient = new StubHttpClient([
      { type: "response", value: jsonResponse(200, tokenSuccess) },
      { type: "response", value: jsonResponse(200, rateSuccess) },
      { type: "response", value: jsonResponse(200, rateSuccess) }
    ]);
    const clock = new FakeClock();
    const client = new UpsCarrierClient(baseConfig, httpClient, clock);

    await client.getRates(validRequest);
    await client.getRates(validRequest);

    expect(httpClient.requests).toHaveLength(3);
    expect(httpClient.requests.filter((request) => request.url.includes("/oauth/"))).toHaveLength(1);
  });

  it("refreshes the token after expiry", async () => {
    const httpClient = new StubHttpClient([
      { type: "response", value: jsonResponse(200, tokenSuccess) },
      { type: "response", value: jsonResponse(200, rateSuccess) },
      { type: "response", value: jsonResponse(200, tokenRefresh) },
      { type: "response", value: jsonResponse(200, rateSuccess) }
    ]);
    const clock = new FakeClock();
    const client = new UpsCarrierClient(baseConfig, httpClient, clock);

    await client.getRates(validRequest);
    clock.advance(3_600_000);
    await client.getRates(validRequest);

    expect(httpClient.requests.filter((request) => request.url.includes("/oauth/"))).toHaveLength(2);
    expect(httpClient.requests[3]?.headers?.Authorization).toBe("Bearer ups-access-token-refreshed");
  });

  it("surfaces auth failures as structured authentication errors", async () => {
    const httpClient = new StubHttpClient([
      { type: "response", value: jsonResponse(200, tokenSuccess) },
      { type: "response", value: jsonResponse(401, error401) }
    ]);
    const client = new UpsCarrierClient(baseConfig, httpClient, new FakeClock());

    await expect(client.getRates(validRequest)).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("surfaces rate limiting as a dedicated structured error", async () => {
    const httpClient = new StubHttpClient([
      { type: "response", value: jsonResponse(200, tokenSuccess) },
      { type: "response", value: jsonResponse(429, error429) }
    ]);
    const client = new UpsCarrierClient(baseConfig, httpClient, new FakeClock());

    await expect(client.getRates(validRequest)).rejects.toBeInstanceOf(RateLimitError);
  });

  it("surfaces server errors as HTTP errors", async () => {
    const httpClient = new StubHttpClient([
      { type: "response", value: jsonResponse(200, tokenSuccess) },
      { type: "response", value: jsonResponse(500, error500) }
    ]);
    const client = new UpsCarrierClient(baseConfig, httpClient, new FakeClock());

    await expect(client.getRates(validRequest)).rejects.toBeInstanceOf(HttpError);
  });

  it("rejects malformed UPS responses", async () => {
    const httpClient = new StubHttpClient([
      { type: "response", value: jsonResponse(200, tokenSuccess) },
      { type: "response", value: jsonResponse(200, malformedRate) }
    ]);
    const client = new UpsCarrierClient(baseConfig, httpClient, new FakeClock());

    await expect(client.getRates(validRequest)).rejects.toBeInstanceOf(MalformedResponseError);
  });

  it("surfaces invalid JSON responses", async () => {
    const httpClient = new StubHttpClient([
      { type: "response", value: jsonResponse(200, tokenSuccess) },
      {
        type: "response",
        value: {
          status: 200,
          headers: {
            "content-type": "application/json"
          },
          bodyText: "{not-json"
        }
      }
    ]);
    const client = new UpsCarrierClient(baseConfig, httpClient, new FakeClock());

    await expect(client.getRates(validRequest)).rejects.toBeInstanceOf(MalformedResponseError);
  });

  it("bubbles timeout errors from the HTTP layer", async () => {
    const httpClient = new StubHttpClient([
      { type: "response", value: jsonResponse(200, tokenSuccess) },
      { type: "error", value: new TimeoutError("Request to carrier timed out.") }
    ]);
    const client = new UpsCarrierClient(baseConfig, httpClient, new FakeClock());

    await expect(client.getRates(validRequest)).rejects.toBeInstanceOf(TimeoutError);
  });

  it("validates the request before making external calls", async () => {
    const httpClient = new StubHttpClient([]);
    const client = new UpsCarrierClient(baseConfig, httpClient, new FakeClock());

    const invalidRequest = {
      ...validRequest,
      packages: []
    };

    await expect(client.getRates(invalidRequest)).rejects.toBeInstanceOf(ValidationError);
    expect(httpClient.requests).toHaveLength(0);
  });
});
