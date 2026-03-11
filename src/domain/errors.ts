export type CarrierErrorCode =
	| 'VALIDATION_ERROR'
	| 'AUTHENTICATION_ERROR'
	| 'RATE_LIMIT_ERROR'
	| 'TIMEOUT_ERROR'
	| 'HTTP_ERROR'
	| 'MALFORMED_RESPONSE'
	| 'NETWORK_ERROR';

export class CarrierError extends Error {
	public readonly code: CarrierErrorCode;
	public readonly statusCode: number | undefined;
	public readonly details: unknown;

	public constructor(
		code: CarrierErrorCode,
		message: string,
		options?: {
			statusCode?: number;
			details?: unknown;
			cause?: unknown;
		},
	) {
		super(message, { cause: options?.cause });
		this.name = 'CarrierError';
		this.code = code;
		this.statusCode = options?.statusCode;
		this.details = options?.details;
	}
}

export class ValidationError extends CarrierError {
	public constructor(message: string, details?: unknown) {
		super('VALIDATION_ERROR', message, { details });
		this.name = 'ValidationError';
	}
}

export class AuthenticationError extends CarrierError {
	public constructor(message: string, statusCode?: number, details?: unknown) {
		super(
			'AUTHENTICATION_ERROR',
			message,
			statusCode === undefined ? { details } : { statusCode, details },
		);
		this.name = 'AuthenticationError';
	}
}

export class RateLimitError extends CarrierError {
	public constructor(message: string, statusCode?: number, details?: unknown) {
		super(
			'RATE_LIMIT_ERROR',
			message,
			statusCode === undefined ? { details } : { statusCode, details },
		);
		this.name = 'RateLimitError';
	}
}

export class TimeoutError extends CarrierError {
	public constructor(message: string, details?: unknown) {
		super('TIMEOUT_ERROR', message, { details });
		this.name = 'TimeoutError';
	}
}

export class HttpError extends CarrierError {
	public constructor(message: string, statusCode?: number, details?: unknown) {
		super(
			'HTTP_ERROR',
			message,
			statusCode === undefined ? { details } : { statusCode, details },
		);
		this.name = 'HttpError';
	}
}

export class MalformedResponseError extends CarrierError {
	public constructor(message: string, details?: unknown) {
		super('MALFORMED_RESPONSE', message, { details });
		this.name = 'MalformedResponseError';
	}
}

export class NetworkError extends CarrierError {
	public constructor(message: string, details?: unknown) {
		super('NETWORK_ERROR', message, { details });
		this.name = 'NetworkError';
	}
}
