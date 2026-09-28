import { db } from './index';
import { sql } from 'drizzle-orm';
import { organizations, productTypes, type WorkflowStep } from './schema';

/**
 * Live Migration & Seeding for Dynamic Product Categorization & Workflow Builder
 */
async function migrateProductTypes() {
  console.log('🚀 Running product_types & schema extensions migration on Neon Postgres…');

  // 1. Column extensions on inventory_items
  await db.execute(sql`
    ALTER TABLE "inventory_items"
    ADD COLUMN IF NOT EXISTS "custom_category" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "is_gst_exempt" BOOLEAN NOT NULL DEFAULT FALSE;
  `);
  console.log('✅ inventory_items columns updated.');

  // 2. Column extensions on store_profile
  await db.execute(sql`
    ALTER TABLE "store_profile"
    ADD COLUMN IF NOT EXISTS "enable_gst" BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS "allow_negative_stock" BOOLEAN NOT NULL DEFAULT TRUE;
  `);
  console.log('✅ store_profile columns updated.');

  // 3. Create product_types table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "product_types" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "code" VARCHAR(50) NOT NULL,
      "name" VARCHAR(100) NOT NULL,
      "description" TEXT,
      "icon" VARCHAR(50) DEFAULT 'Glasses',
      "base_price" NUMERIC(12, 2) NOT NULL DEFAULT '0.00',
      "is_system_default" BOOLEAN NOT NULL DEFAULT FALSE,
      "is_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
      "display_order" INTEGER NOT NULL DEFAULT 0,
      "requires_frame" BOOLEAN NOT NULL DEFAULT FALSE,
      "requires_prescription" BOOLEAN NOT NULL DEFAULT FALSE,
      "workflow_steps" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "product_types_org_idx" ON "product_types" ("organization_id");
    CREATE INDEX IF NOT EXISTS "product_types_code_idx" ON "product_types" ("code");
  `);
  console.log('✅ product_types table created successfully.');

  // 4. Default Optical Workflow Schemas
  const lensSteps: WorkflowStep[] = [
    {
      id: 'step_focus_type',
      stepName: 'Focus Type',
      inputType: 'single_select',
      options: [
        { label: 'Single Vision (Distance / Reading)', value: 'SINGLE_VISION', surcharge: 0 },
        { label: 'Bifocal (D-Segment / Kryptok)', value: 'BIFOCAL', surcharge: 500 },
        { label: 'Progressive / PAL (No Line Multfocal)', value: 'PROGRESSIVE', surcharge: 1200 },
      ],
    },
    {
      id: 'step_inner_design',
      stepName: 'Lens Design & Corridor',
      inputType: 'single_select',
      options: [
        { label: 'Standard Digital Corridor', value: 'STANDARD_DESIGN', surcharge: 0 },
      ],
      dependency: {
        stepId: 'step_focus_type',
        whenValueEquals: ['BIFOCAL', 'PROGRESSIVE'],
        showOptions: [
          // Shown if Bifocal
          { label: 'Kryptok Round Segment', value: 'KRYPTOK', surcharge: 0 },
          { label: 'Flat-Top D Segment', value: 'FLAT_TOP_D', surcharge: 250 },
          { label: 'Executive Full Bifocal', value: 'EXECUTIVE', surcharge: 600 },
          // Shown if Progressive
          { label: 'Standard Entry PAL', value: 'STANDARD_PAL', surcharge: 0 },
          { label: 'Digital Freeform HD Corridor', value: 'DIGITAL_FREEFORM', surcharge: 800 },
          { label: 'Wider Corridor Panorama PAL', value: 'WIDER_CORRIDOR', surcharge: 1500 },
        ],
      },
    },
    {
      id: 'step_material_index',
      stepName: 'Material & Refractive Index',
      inputType: 'single_select',
      options: [
        { label: '1.50 Standard CR-39 Resin', value: 'INDEX_150', surcharge: 0 },
        { label: '1.56 Mid-Index Thin', value: 'INDEX_156', surcharge: 400 },
        { label: '1.59 Impact Polycarbonate', value: 'POLYCARBONATE', surcharge: 900 },
        { label: '1.67 High-Index Ultra Thin', value: 'INDEX_167', surcharge: 1800 },
        { label: '1.74 Ultra Hi-Index Featherweight', value: 'INDEX_174', surcharge: 3200 },
      ],
    },
    {
      id: 'step_coatings',
      stepName: 'Performance Coatings & Treatments',
      inputType: 'multi_select',
      options: [
        { label: 'Anti-Reflective Glare Shield', value: 'COATING_ARC', surcharge: 450 },
        { label: 'Blue-Cut Screen Filter (Digital Guard)', value: 'COATING_BLUE_CUT', surcharge: 750 },
        { label: 'Photochromic Sun-Adaptive Transition', value: 'COATING_PHOTOCHROMIC', surcharge: 1400 },
        { label: 'Hydrophobic & Oleophobic Water-Repel', value: 'COATING_HYDROPHOBIC', surcharge: 350 },
        { label: 'UV400 Solar Armor', value: 'COATING_UV400', surcharge: 250 },
      ],
    },
  ];

  const frameSteps: WorkflowStep[] = [
    {
      id: 'step_frame_source',
      stepName: 'Frame Source',
      inputType: 'single_select',
      options: [
        { label: 'Select Store Display Frame', value: 'STORE_FRAME', surcharge: 0 },
        { label: "Customer's Own Frame (Fitting Only)", value: 'CUSTOMER_OWN_FRAME', surcharge: 150 },
      ],
    },
    {
      id: 'step_frame_rim_type',
      stepName: 'Rim Construction',
      inputType: 'single_select',
      options: [
        { label: 'Full Rim Acetate / Metal', value: 'FULL_RIM', surcharge: 0 },
        { label: 'Semi-Rimless Supra Groove', value: 'SEMI_RIMLESS', surcharge: 100 },
        { label: 'Rimless 3-Piece Drill Mount', value: 'RIMLESS_DRILL', surcharge: 300 },
      ],
    },
  ];

  const sunglassSteps: WorkflowStep[] = [
    {
      id: 'step_sunglass_lens',
      stepName: 'Lens Tint & Protection',
      inputType: 'single_select',
      options: [
        { label: 'Standard 100% UV Protection Tint', value: 'UV_TINT', surcharge: 0 },
        { label: 'HD Polarized Glare Filter', value: 'POLARIZED', surcharge: 800 },
        { label: 'Flash Mirror Silver/Blue Coating', value: 'MIRROR', surcharge: 600 },
        { label: 'Graduated Gradient Tint', value: 'GRADIENT', surcharge: 400 },
      ],
    },
  ];

  const contactLensSteps: WorkflowStep[] = [
    {
      id: 'step_cl_modality',
      stepName: 'Replacement Schedule',
      inputType: 'single_select',
      options: [
        { label: 'Daily Disposable (30 pack)', value: 'DAILY', surcharge: 0 },
        { label: 'Monthly Replacement (6 pack)', value: 'MONTHLY', surcharge: 200 },
        { label: 'Annual Conventional Vial', value: 'ANNUAL', surcharge: 500 },
      ],
    },
    {
      id: 'step_cl_design',
      stepName: 'Correction Type',
      inputType: 'single_select',
      options: [
        { label: 'Spherical Single Vision', value: 'SPHERICAL', surcharge: 0 },
        { label: 'Toric for Astigmatism', value: 'TORIC', surcharge: 600 },
        { label: 'Multifocal Presbyopia', value: 'MULTIFOCAL', surcharge: 900 },
        { label: 'Color / Cosmetic Enhancer', value: 'COSMETIC', surcharge: 400 },
      ],
    },
  ];

  // Seed for all active organizations
  const allOrgs = await db.select({ id: organizations.id }).from(organizations);

  for (const org of allOrgs) {
    const defaultConfigs = [
      {
        organizationId: org.id,
        code: 'LENS',
        name: 'Spectacle Lenses',
        description: 'Guided optical lens selection with focal types, materials, and premium coatings',
        icon: 'Eye',
        basePrice: '800.00',
        isSystemDefault: true,
        isEnabled: true,
        displayOrder: 1,
        requiresFrame: true,
        requiresPrescription: true,
        workflowSteps: lensSteps,
      },
      {
        organizationId: org.id,
        code: 'FRAME',
        name: 'Frames & Mountings',
        description: 'Eyeglass frames, rimless drill mounts, and customer own frame fittings',
        icon: 'Glasses',
        basePrice: '1200.00',
        isSystemDefault: true,
        isEnabled: true,
        displayOrder: 2,
        requiresFrame: false,
        requiresPrescription: false,
        workflowSteps: frameSteps,
      },
      {
        organizationId: org.id,
        code: 'SUNGLASS',
        name: 'Sunglasses',
        description: 'Polarized, UV400, and designer tinted sunglasses',
        icon: 'Sun',
        basePrice: '1500.00',
        isSystemDefault: true,
        isEnabled: true,
        displayOrder: 3,
        requiresFrame: false,
        requiresPrescription: false,
        workflowSteps: sunglassSteps,
      },
      {
        organizationId: org.id,
        code: 'CONTACT_LENS',
        name: 'Contact Lenses',
        description: 'Daily, monthly, toric, and cosmetic soft contact lenses',
        icon: 'CircleDot',
        basePrice: '1100.00',
        isSystemDefault: true,
        isEnabled: true,
        displayOrder: 4,
        requiresFrame: false,
        requiresPrescription: true,
        workflowSteps: contactLensSteps,
      },
    ];

    for (const conf of defaultConfigs) {
      // Check if already seeded
      const existing = await db
        .select({ id: productTypes.id })
        .from(productTypes)
        .where(
          sql`${productTypes.organizationId} = ${org.id} AND ${productTypes.code} = ${conf.code}`
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(productTypes).values(conf);
        console.log(`  + Seeded default type [${conf.code}] for org ${org.id}`);
      }
    }
  }

  console.log('🎉 Product Types migration & seeding completed successfully!');
}

migrateProductTypes()
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  })
  .then(() => process.exit(0));
