import { z } from "zod";
import { addressSchema } from "./address.js";
import { parcelSchema } from "./parcel.js";
import { carrierServiceLevelSchema } from "./service-level.js";

export const rateRequestSchema = z.object({
  shipper: addressSchema,
  recipient: addressSchema,
  packages: z.array(parcelSchema).min(1),
  serviceLevel: carrierServiceLevelSchema.optional(),
  shipmentDate: z.string().datetime({ offset: true }).optional()
});

export type RateRequest = z.infer<typeof rateRequestSchema>;
