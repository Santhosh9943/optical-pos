// src/lib/validators/prescription.ts
import { z } from 'zod';

/** Integer-scaling refinement to prevent IEEE-754 floating-point validation bugs */
export const isQuarterStep = (val: number): boolean => {
  const scaled = Math.round(val * 100);
  return scaled % 25 === 0;
};

export const sphereSchema = z.preprocess(
  (val) => {
    if (val === null || val === undefined || val === '') return null;
    return typeof val === 'string' ? parseFloat(val) : val;
  },
  z
    .number()
    .min(-20, 'SPH must be ≥ −20.00')
    .max(20, 'SPH must be ≤ +20.00')
    .refine(isQuarterStep, 'SPH must be a multiple of 0.25')
    .nullable()
);

export const cylinderSchema = z.preprocess(
  (val) => {
    if (val === null || val === undefined || val === '') return null;
    return typeof val === 'string' ? parseFloat(val) : val;
  },
  z
    .number()
    .min(-6, 'CYL must be ≥ −6.00')
    .max(6, 'CYL must be ≤ +6.00')
    .refine(isQuarterStep, 'CYL must be a multiple of 0.25')
    .nullable()
);

export const axisSchema = z.preprocess(
  (val) => {
    if (
      val === null ||
      val === undefined ||
      val === '' ||
      val === 0 ||
      Number(val) === 0
    ) {
      return null;
    }
    return typeof val === 'string' ? parseInt(val, 10) : val;
  },
  z
    .number()
    .int('Axis must be a whole number')
    .min(1, 'Axis must be ≥ 1°')
    .max(180, 'Axis must be ≤ 180°')
    .nullable()
);

export const addSchema = z.preprocess(
  (val) => {
    if (
      val === null ||
      val === undefined ||
      val === '' ||
      val === 0 ||
      Number(val) === 0
    ) {
      return null;
    }
    return typeof val === 'string' ? parseFloat(val) : val;
  },
  z
    .number()
    .min(0.75, 'ADD must be ≥ +0.75')
    .max(4.0, 'ADD must be ≤ +4.00')
    .refine(isQuarterStep, 'ADD must be a multiple of 0.25')
    .nullable()
);

export const pdSchema = z.preprocess(
  (val) => {
    if (
      val === null ||
      val === undefined ||
      val === '' ||
      val === 0 ||
      Number(val) === 0
    ) {
      return null;
    }
    return typeof val === 'string' ? parseFloat(val) : val;
  },
  z
    .number()
    .min(20, 'PD must be ≥ 20 mm')
    .max(80, 'PD must be ≤ 80 mm')
    .nullable()
);

export const prescriptionSchema = z
  .object({
    customerId: z.string().uuid().optional(),
    odSphere: sphereSchema,
    odCylinder: cylinderSchema,
    odAxis: axisSchema,
    odAdd: addSchema,
    odPd: pdSchema,
    osSphere: sphereSchema,
    osCylinder: cylinderSchema,
    osAxis: axisSchema,
    osAdd: addSchema,
    osPd: pdSchema,
    binocularPd: pdSchema,
    odBaseCurve: z.number().min(7).max(10).nullable().optional(),
    odDiameter: z.number().min(13).max(15).nullable().optional(),
    osBaseCurve: z.number().min(7).max(10).nullable().optional(),
    osDiameter: z.number().min(13).max(15).nullable().optional(),
    prismNotes: z.string().max(500).optional().nullable(),
    visualAcuityNotes: z.string().max(500).optional().nullable(),
    clinicalRemarks: z.string().max(1000).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // Axis required when CYL ≠ 0
    if (data.odCylinder !== null && data.odCylinder !== 0 && data.odAxis === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OD Axis is required when OD Cylinder is non-zero',
        path: ['odAxis'],
      });
    }
    if (data.osCylinder !== null && data.osCylinder !== 0 && data.osAxis === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OS Axis is required when OS Cylinder is non-zero',
        path: ['osAxis'],
      });
    }
    // Monocular PD sum consistency
    if (data.odPd && data.osPd && data.binocularPd) {
      const sum = data.odPd + data.osPd;
      if (Math.abs(sum - data.binocularPd) > 0.5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Monocular PD sum (${sum} mm) deviates from binocular PD (${data.binocularPd} mm) by more than 0.5 mm`,
          path: ['binocularPd'],
        });
      }
    }
  });

export type PrescriptionInput = z.infer<typeof prescriptionSchema>;

// ─────────────────────────────────────────────────────────────
// Invoice / Order validation
// ─────────────────────────────────────────────────────────────

export const invoiceItemSchema = z.object({
  inventoryItemId: z.string().uuid().nullable(),
  description: z.string().min(1).max(300),
  hsnCode: z.string().max(10).nullable().optional(),
  quantity: z.number().int().min(1).max(99999),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid monetary format'),
  discountPerUnit: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0.00'),
  taxRate: z.enum(['5.00', '18.00']),
  lensType: z
    .enum([
      'SINGLE_VISION',
      'BIFOCAL',
      'PROGRESSIVE',
      'PHOTOCHROMIC',
      'BLUE_CUT',
      'PLANO',
    ])
    .nullable()
    .optional(),
  coating: z
    .enum([
      'NONE',
      'ANTI_REFLECTIVE',
      'SCRATCH_RESISTANT',
      'UV400',
      'HYDROPHOBIC',
      'BLUE_FILTER',
    ])
    .nullable()
    .optional(),
  lensMaterial: z
    .enum([
      'CR39',
      'POLYCARBONATE',
      'TRIVEX',
      'HIGH_INDEX_167',
      'HIGH_INDEX_174',
    ])
    .nullable()
    .optional(),
  // Family & Clinical mapping
  patientId: z.string().uuid().nullable().optional(),
  prescriptionId: z.string().uuid().nullable().optional(),
  isCustomerOwnFrame: z.boolean().default(false).optional(),
  fittingNote: z.string().max(500).nullable().optional(),
});

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;

export const patientInputSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().min(1, 'Patient name is required'),
  phone: z.string().min(3, 'Phone number is required'),
  age: z.number().nullable().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).nullable().optional(),
  relationType: z.string().default('Self'),
  primaryCustomerId: z.string().uuid().nullable().optional(),
});

export type PatientInput = z.infer<typeof patientInputSchema>;

export const prescriptionItemInputSchema = z.union([
  z.object({
    patientId: z.string().uuid().optional(),
    patientName: z.string().optional(),
    data: prescriptionSchema,
  }),
  prescriptionSchema.and(
    z.object({
      patientId: z.string().uuid().optional(),
      patientName: z.string().optional(),
    })
  ),
]);

export type PrescriptionItemInput = z.infer<typeof prescriptionItemInputSchema>;

export const invoiceBillingDetailsSchema = z.object({
  billingName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
  notes: z.string().optional(),
});

export type InvoiceBillingDetailsInput = z.infer<typeof invoiceBillingDetailsSchema>;

export const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  // Multi-patient family support
  patients: z.array(patientInputSchema).optional(),
  prescriptions: z.array(prescriptionItemInputSchema).optional(),
  // Legacy / single prescription fallback
  prescription: prescriptionSchema.optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one line item required'),
  advancePayment: z
    .object({
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
      mode: z.enum(['CASH', 'UPI', 'CARD', 'CREDIT']),
      reference: z.string().max(100).optional().nullable(),
    })
    .optional(),
  promisedDeliveryDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  billingDetails: invoiceBillingDetailsSchema.optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

