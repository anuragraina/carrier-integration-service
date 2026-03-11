import { z } from 'zod';

export const carrierServiceLevelSchema = z.object({
	carrier: z.enum(['ups']),
	code: z.string().min(1),
	name: z.string().min(1).optional(),
});

export type CarrierServiceLevel = z.infer<typeof carrierServiceLevelSchema>;
