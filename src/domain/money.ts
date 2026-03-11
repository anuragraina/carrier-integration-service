import { z } from 'zod';

export const moneySchema = z.object({
	currencyCode: z.string().length(3),
	amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
});

export type Money = z.infer<typeof moneySchema>;
