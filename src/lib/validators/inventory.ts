import { z } from 'zod';
import { lenientUuidSchema } from '@/lib/action-utils';

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
  customCategory: z.string().trim().max(100).optional().nullable(),
  isGstExempt: z.boolean().optional().default(false),
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
    .default(0),
  lowStockThreshold: z.coerce
    .number()
    .int()
    .default(5),
  taxRate: z.string().trim().default('18.00'),
  hsnCode: z.string().trim().max(10).optional().nullable(),
  branchId: lenientUuidSchema,
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
