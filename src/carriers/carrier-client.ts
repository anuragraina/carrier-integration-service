import type { RateQuote } from '../domain/rate-quote.js';
import type { RateRequest } from '../domain/rate-request.js';

// Carrier implementations conform to this interface so the caller stays carrier-agnostic.
export interface CarrierClient {
	getRates(request: RateRequest): Promise<RateQuote[]>;
}
