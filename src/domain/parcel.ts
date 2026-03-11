import { z } from "zod";

export const parcelSchema = z.object({
  packagingCode: z.string().min(1).default("02"),
  weight: z.object({
    unit: z.enum(["LBS", "KGS"]),
    value: z.number().positive()
  }),
  dimensions: z.object({
    unit: z.enum(["IN", "CM"]),
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive()
  })
});

export type Parcel = z.infer<typeof parcelSchema>;
