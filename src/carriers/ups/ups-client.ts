import { rateRequestSchema } from '../../domain/rate-request.js';
import type { RateQuote } from '../../domain/rate-quote.js';
import type { RateRequest } from '../../domain/rate-request.js';
import {
	AuthenticationError,
	HttpError,
	MalformedResponseError,
	RateLimitError,
	ValidationError,
} from '../../domain/errors.js';
import type { HttpClient } from '../../infrastructure/http/http-client.js';
import { SystemClock } from '../../infrastructure/time/clock.js';
import type { Clock } from '../../infrastructure/time/clock.js';
import type { AppConfig } from '../../config/env.js';
import type { CarrierClient } from '../carrier-client.js';
import { buildUpsRateRequestPayload, normalizeUpsRateResponse } from './ups-mappers.js';
import { UpsAuthService } from './ups-auth.js';
import { upsErrorSchema, upsRateResponseSchema } from './ups-schemas.js';

export class UpsCarrierClient implements CarrierClient {
	private readonly authService: UpsAuthService;

	public constructor(
		private readonly config: AppConfig,
		private readonly httpClient: HttpClient,
		clock: Clock = new SystemClock(),
	) {
		this.authService = new UpsAuthService(
			{
				clientId: config.UPS_CLIENT_ID,
				clientSecret: config.UPS_CLIENT_SECRET,
				baseUrl: config.UPS_BASE_URL,
				oauthPath: config.UPS_OAUTH_PATH,
				timeoutMs: config.REQUEST_TIMEOUT_MS,
				tokenExpirySkewMs: config.TOKEN_EXPIRY_SKEW_MS,
			},
			httpClient,
			clock,
		);
	}

	public async getRates(request: RateRequest): Promise<RateQuote[]> {
		const parsedRequest = rateRequestSchema.safeParse(request);

		if (!parsedRequest.success) {
			throw new ValidationError(
				'Rate request failed validation.',
				parsedRequest.error.flatten(),
			);
		}

		const accessToken = await this.authService.getAccessToken();
		const payload = buildUpsRateRequestPayload(parsedRequest.data);

		const response = await this.httpClient.send({
			method: 'POST',
			url: new URL(this.config.UPS_RATING_PATH, this.config.UPS_BASE_URL).toString(),
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
				transId: '123456789', // In production, this should be a unique ID for each request
				transactionSrc: 'cybership',
			},
			body: JSON.stringify(payload),
			timeoutMs: this.config.REQUEST_TIMEOUT_MS,
		});

		if (response.status === 401) {
			throw new AuthenticationError(
				'UPS rejected the bearer token for the rating request.',
				response.status,
				this.parseErrorBody(response.bodyText),
			);
		}

		if (response.status === 429) {
			throw new RateLimitError(
				'UPS rate limit exceeded.',
				response.status,
				this.parseErrorBody(response.bodyText),
			);
		}

		if (response.status >= 400) {
			throw new HttpError(
				'UPS rating request failed.',
				response.status,
				this.parseErrorBody(response.bodyText),
			);
		}

		const responseBody = this.parseJson(response.bodyText);
		const parsedResponse = upsRateResponseSchema.safeParse(responseBody);

		if (!parsedResponse.success) {
			throw new MalformedResponseError(
				'UPS rate response did not match the expected schema.',
				{
					issues: parsedResponse.error.issues,
				},
			);
		}

		return normalizeUpsRateResponse(
			parsedResponse.data as Parameters<typeof normalizeUpsRateResponse>[0],
		);
	}

	private parseJson(bodyText: string): unknown {
		try {
			return JSON.parse(bodyText);
		} catch (error) {
			throw new MalformedResponseError('UPS rating response returned invalid JSON.', {
				bodyText,
				cause: error,
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
