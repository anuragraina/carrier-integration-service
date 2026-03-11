import { z } from 'zod';

export const upsTokenResponseSchema = z.object({
	token_type: z.string().min(1),
	access_token: z.string().min(1),
	expires_in: z.coerce.number().positive(),
});

export const upsRateResponseSchema = z.object({
	RateResponse: z.object({
		Response: z.object({
			ResponseStatus: z.object({
				Code: z.string().min(1),
				Description: z.string().min(1),
			}),
		}),
		RatedShipment: z
			.array(
				z.object({
					Service: z.object({
						Code: z.string().min(1),
					}),
					TotalCharges: z.object({
						CurrencyCode: z.string().length(3),
						MonetaryValue: z.string().min(1),
					}),
					BillingWeight: z
						.object({
							UnitOfMeasurement: z.object({
								Code: z.string().min(1),
							}),
							Weight: z.string().min(1),
						})
						.optional(),
					GuaranteedDelivery: z
						.object({
							BusinessDaysInTransit: z.string().optional(),
							DeliveryByTime: z.string().optional(),
						})
						.optional(),
				}),
			)
			.min(1),
	}),
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
