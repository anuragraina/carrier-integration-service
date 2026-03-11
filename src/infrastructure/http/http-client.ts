// Small transport abstraction that keeps HTTP concerns easy to stub in tests.
export interface HttpRequest {
	method: 'GET' | 'POST';
	url: string;
	headers?: Record<string, string>;
	body?: string;
	timeoutMs?: number;
}

export interface HttpResponse {
	status: number;
	headers: Record<string, string>;
	bodyText: string;
}

export interface HttpClient {
	send(request: HttpRequest): Promise<HttpResponse>;
}
