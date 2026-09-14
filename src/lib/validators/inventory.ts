import { z } from 'zod';

export const inventoryCategoryValues = [
  'FRAME',
  'SUNGLASS',
  'OPHTHALMIC_LENS',
  'CONTACT_LENS',
  'ACCESSORY',
  'SERVICE',
] as const;

export const createInventoryItemSchema = z.object({
  sku: z.string().trim().max(50).optional(),
  barcode: z.string().trim().max(50).optional().nullable(),
  category: z.enum(inventoryCategoryValues),
  brand: z.string().trim().max(100).optional().nullable(),
  model: z.string().trim().max(150).optional().nullable(),
  description: z.string().trim().optional().nullable(),
  costPrice: z
    .string()
    .trim()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
      message: 'Cost price must be a valid positive number',
    })
    .default('0.00'),
  sellingPrice: z
    .string()
    .trim()
    .min(1, 'Selling price is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Selling price must be a valid positive number',
    }),
  mrp: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
      message: 'MRP must be a valid positive number',
    }),
  stockQuantity: z.coerce
    .number()
    .int()
    .min(0, 'Stock quantity cannot be negative')
    .default(0),
  lowStockThreshold: z.coerce
    .number()
    .int()
    .min(0, 'Low stock threshold cannot be negative')
    .default(5),
  taxRate: z.enum(['5.00', '18.00']).default('18.00'),
  hsnCode: z.string().trim().max(10).optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
