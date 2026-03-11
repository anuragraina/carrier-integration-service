export interface UpsTokenResponse {
	token_type: string;
	access_token: string;
	expires_in: number;
}

export interface UpsErrorPayload {
	response?: {
		errors?: Array<{
			code?: string;
			message?: string;
		}>;
	};
}
