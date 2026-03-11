import { z } from 'zod';

export const addressSchema = z.object({
	name: z.string().min(1).max(100),
	addressLine1: z.string().min(1).max(100),
	addressLine2: z.string().max(100).optional(),
	city: z.string().min(1).max(50),
	stateProvinceCode: z.string().min(2).max(5),
	postalCode: z.string().min(1).max(20),
	countryCode: z.string().length(2),
});

export type Address = z.infer<typeof addressSchema>;
