import { z } from 'zod';
import { moneySchema } from './money.js';

// Normalized quote shape returned to the caller regardless of carrier.
export const rateQuoteSchema = z.object({
	carrier: z.enum(['ups']),
	serviceCode: z.string().min(1),
	serviceName: z.string().min(1),
	totalCharge: moneySchema,
	billingWeight: z
		.object({
			unit: z.string().min(1),
			value: z.string().min(1),
		})
		.optional(),
	estimatedDeliveryDate: z.string().optional(),
	metadata: z.record(z.string(), z.string()).default({}),
});

export type RateQuote = z.infer<typeof rateQuoteSchema>;
