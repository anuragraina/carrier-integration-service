import { z } from 'zod';

export const upsTokenResponseSchema = z.object({
	token_type: z.string().min(1),
	access_token: z.string().min(1),
	expires_in: z.coerce.number().positive(),
});

export const upsErrorSchema = z.object({
	response: z
		.object({
			errors: z
				.array(
					z.object({
						code: z.string().optional(),
						message: z.string().optional(),
					}),
				)
				.optional(),
		})
		.optional(),
});
