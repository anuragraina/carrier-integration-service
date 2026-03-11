import type { RateQuote } from '../domain/rate-quote.js';
import type { RateRequest } from '../domain/rate-request.js';

export interface CarrierClient {
	getRates(request: RateRequest): Promise<RateQuote[]>;
}
