# Carrier Integration Service

This project implements a production-style carrier integration module around the UPS Rating API with strong typing, runtime validation, token lifecycle management, structured error handling, and integration tests that run entirely against stubbed HTTP responses.

## Highlights

- Normalized internal shipping models isolate callers from UPS-specific payloads.
- OAuth client-credentials flow with token caching, reuse, and refresh on expiry.
- Runtime validation for both inbound requests and outbound carrier responses.
- Structured error mapping for validation, authentication, rate limiting, timeouts, malformed responses, and upstream failures.
- Carrier-oriented architecture that can be extended to additional carriers or additional UPS operations.

## Design goals

- Keep the caller isolated from UPS-specific request and response formats.
- Make it straightforward to add another carrier or another UPS operation later.
- Validate both inbound domain requests and outbound carrier responses at runtime.
- Treat authentication, timeouts, malformed payloads, and upstream failures as first-class structured errors.

## Architecture

The module is split into a few clear layers:

- `src/domain`: internal request, quote, money, address, parcel, and error models.
- `src/carriers`: carrier abstraction plus the UPS-specific implementation.
- `src/infrastructure`: shared HTTP and time abstractions.
- `src/config`: environment-backed configuration loading and validation.

Within the UPS implementation:

- `ups-auth.ts` handles OAuth client-credentials token acquisition and caching.
- `ups-mappers.ts` maps internal domain objects to UPS payloads and normalizes UPS responses back into internal quote objects.
- `ups-client.ts` orchestrates validation, auth, request submission, response validation, and error mapping.

## Why this structure

The most important boundary is between internal shipping models and UPS models. Callers interact with `RateRequest` and `RateQuote`, not raw UPS JSON. That keeps the service extensible:

- Adding FedEx would mean creating `src/carriers/fedex/...` plus a `FedExCarrierClient` implementing the same `CarrierClient` interface.
- Adding UPS label purchase later would mean adding another UPS operation module without rewriting the current rate flow.

## Token lifecycle

`UpsAuthService` performs OAuth client-credentials authentication, caches the token in memory, and refreshes it before expiry using a configurable skew window. This behavior is transparent to callers.

## Validation and errors

`zod` is used in two places:

- validating incoming domain requests before any HTTP call is made
- validating UPS auth and rating responses before mapping

Structured errors live in `src/domain/errors.ts` and include:

- `ValidationError`
- `AuthenticationError`
- `RateLimitError`
- `TimeoutError`
- `HttpError`
- `MalformedResponseError`
- `NetworkError`

## Testing approach

The integration tests in `tests/integration/ups-rating.integration.test.ts` stub the HTTP layer and exercise the service end to end:

- request payload building
- response normalization
- token acquisition, reuse, and refresh
- 401 / 429 / 5xx handling
- malformed JSON and malformed schemas
- request validation before external calls

This keeps the tests realistic without requiring live UPS credentials.

## Example usage

```ts
import { loadConfig, UpsCarrierClient } from './src/index.js';
import { FetchHttpClient } from './src/infrastructure/http/fetch-http-client.js';

const config = loadConfig();
const client = new UpsCarrierClient(config, new FetchHttpClient());

const quotes = await client.getRates({
	shipper: {
		name: 'Warehouse A',
		addressLine1: '123 Origin St',
		city: 'Atlanta',
		stateProvinceCode: 'GA',
		postalCode: '30301',
		countryCode: 'US',
	},
	recipient: {
		name: 'Customer B',
		addressLine1: '987 Destination Ave',
		city: 'Miami',
		stateProvinceCode: 'FL',
		postalCode: '33101',
		countryCode: 'US',
	},
	packages: [
		{
			packagingCode: '02',
			weight: {
				unit: 'LBS',
				value: 2,
			},
			dimensions: {
				unit: 'IN',
				length: 10,
				width: 8,
				height: 4,
			},
		},
	],
});

console.log(quotes);
```

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Copy environment values from `.env.example` into your local environment or a `.env` file.

3. Run the type check:

```bash
npm run build
```

4. Run the tests:

```bash
npm test
```

## Environment variables

See `.env.example` for the full list:

- `UPS_CLIENT_ID`
- `UPS_CLIENT_SECRET`
- `UPS_BASE_URL`
- `UPS_OAUTH_PATH`
- `UPS_RATING_PATH`
- `REQUEST_TIMEOUT_MS`
- `TOKEN_EXPIRY_SKEW_MS`

## What I would improve next

- Add support for UPS account-specific request options and negotiated rates.
- Add a higher-level carrier registry/factory for selecting carriers by code.
- Move service names and code mappings into carrier-specific reference data.
- Add retry policies for transient upstream failures where appropriate.
- Add request correlation IDs and logging hooks.
- Add more operations such as label purchase and tracking using the same carrier pattern.
- Add contract snapshots for documented UPS request and response examples.
