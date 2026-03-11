import { z } from 'zod';

// Optional carrier service hint when the caller wants a specific service level.
export const carrierServiceLevelSchema = z.object({
	carrier: z.enum(['ups']),
	code: z.string().min(1),
	name: z.string().min(1).optional(),
});

export type CarrierServiceLevel = z.infer<typeof carrierServiceLevelSchema>;
