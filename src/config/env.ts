import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

// Load environment variables before validating the config shape.
loadEnv();

const envSchema = z.object({
	UPS_CLIENT_ID: z.string().min(1),
	UPS_CLIENT_SECRET: z.string().min(1),
	UPS_BASE_URL: z.string().url(),
	UPS_OAUTH_PATH: z.string().min(1),
	UPS_RATING_PATH: z.string().min(1),
	REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
	TOKEN_EXPIRY_SKEW_MS: z.coerce.number().int().nonnegative().default(30000),
});

export type AppConfig = z.infer<typeof envSchema>;

// Centralized config validation keeps secrets and environment-specific values out of code.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
	return envSchema.parse(env);
}
