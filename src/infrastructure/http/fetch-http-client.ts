import { NetworkError, TimeoutError } from '../../domain/errors.js';
import type { HttpClient, HttpRequest, HttpResponse } from './http-client.js';

export class FetchHttpClient implements HttpClient {
	public async send(request: HttpRequest): Promise<HttpResponse> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), request.timeoutMs ?? 10000);
		const init: RequestInit = {
			method: request.method,
			signal: controller.signal,
		};

		if (request.headers) {
			init.headers = request.headers;
		}

		if (request.body !== undefined) {
			init.body = request.body;
		}

		try {
			const response = await fetch(request.url, init);
			const headers: Record<string, string> = {};
			response.headers.forEach((value, key) => {
				headers[key] = value;
			});
			const bodyText = await response.text();

			return {
				status: response.status,
				headers,
				bodyText,
			};
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				throw new TimeoutError('Request to carrier timed out.', { url: request.url });
			}

			throw new NetworkError('Network error while contacting carrier.', {
				url: request.url,
				cause: error,
			});
		} finally {
			clearTimeout(timeoutId);
		}
	}
}
