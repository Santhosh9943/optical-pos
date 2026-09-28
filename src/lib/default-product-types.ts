import { db } from '@/db';
import { productTypes, type WorkflowStep } from '@/db/schema';
import { sql } from 'drizzle-orm';

/**
 * Returns the recommended optical product types and workflow schemas.
 * Every optical practice has these default workflows available out-of-the-box.
 * Practice owners can enable, disable, or edit any of these product types in Admin Settings.
 *
 * @returns Array of default product type definitions with workflow steps
 */
export function getDefaultProductTypesConfig(): Array<{
  code: string;
  name: string;
  description: string;
  icon: string;
  basePrice: string;
  isSystemDefault: boolean;
  isEnabled: boolean;
  displayOrder: number;
  requiresFrame: boolean;
  requiresPrescription: boolean;
  workflowSteps: WorkflowStep[];
}> {
  // ─────────────────────────────────────────────────────────────
  // 1. SPECTACLE FRAMES (OR EYEGLASSES)
  // ─────────────────────────────────────────────────────────────
  const frameSteps: WorkflowStep[] = [
    {
      id: 'step_frame_category',
      stepName: 'Select Frame Category',
      inputType: 'single_select',
      options: [
        { label: "Men's Frames", value: 'MENS_FRAMES', surcharge: 0, description: 'Men designer & everyday eyewear' },
        { label: "Women's Frames", value: 'WOMENS_FRAMES', surcharge: 0, description: 'Women fashion & lightweight frames' },
        { label: "Kids' Frames", value: 'KIDS_FRAMES', surcharge: 0, description: 'Flexible & durable frames for children' },
        { label: 'Reading Glasses', value: 'READING_GLASSES', surcharge: 0, description: 'Ready & custom near reading frames' },
      ],
    },
    {
      id: 'step_frame_rim',
      stepName: 'Rim Construction & Mounting',
      inputType: 'single_select',
      options: [
        { label: 'Full Rim (Metal / Acetate)', value: 'FULL_RIM', surcharge: 0, description: 'Standard enclosed rim design' },
        { label: 'Semi-Rimless (Supra / Nylon String)', value: 'SEMI_RIMLESS', surcharge: 100, description: 'Nylon cord bottom mount' },
        { label: 'Rimless (Three-Piece / Drill Mount)', value: 'RIMLESS', surcharge: 300, description: 'Drill mounted chassis' },
      ],
    },
    {
      id: 'step_frame_source',
      stepName: 'Frame Source',
      inputType: 'single_select',
      options: [
        { label: 'Select Store Display Frame', value: 'STORE_FRAME', surcharge: 0, description: 'Brand new frame from active inventory' },
        { label: "Customer's Own Frame (Fitting Only)", value: 'CUSTOMER_OWN_FRAME', surcharge: 150, description: 'Re-glazing service on customer frame' },
      ],
    },
  ];

  // ─────────────────────────────────────────────────────────────
  // 2. SPECTACLE LENSES (AUTHORITATIVE OPTIXOS 4-STEP LENS FLOW)
  // ─────────────────────────────────────────────────────────────
  const lensSteps: WorkflowStep[] = [
    // Step 1: Select Focus Type (Main Category)
    {
      id: 'step_focus_type',
      stepName: 'Select Focus Type',
      inputType: 'single_select',
      options: [
        {
          label: 'Single Vision (Distance, Reading, or Plano/Zero Power)',
          value: 'SINGLE_VISION',
          surcharge: 0,
          description: 'Single focal distance across the entire lens surface',
        },
        {
          label: 'Bifocal (Two focal points)',
          value: 'BIFOCAL',
          surcharge: 500,
          description: 'Distinct distance upper zone and near reading segment',
        },
        {
          label: 'Progressive (PAL) (No-line multifocal)',
          value: 'PROGRESSIVE',
          surcharge: 1200,
          description: 'Seamless corridor transitioning from distance to intermediate & near',
        },
      ],
    },
    // Step 2: Select Inner Type / Design (Subcategory conditioned on Focus Type)
    {
      id: 'step_inner_design',
      stepName: 'Select Inner Type / Design',
      inputType: 'single_select',
      options: [
        // If Single Vision:
        {
          label: 'Plano / Stock Lens (Pre-made zero power)',
          value: 'PLANO_STOCK',
          surcharge: 0,
          showIfParent: ['SINGLE_VISION'],
          description: 'Zero optical power for cosmetic or blue protection wear',
        },
        {
          label: 'Spherical (Standard design)',
          value: 'SPHERICAL',
          surcharge: 200,
          showIfParent: ['SINGLE_VISION'],
          description: 'Conventional optical curve for mild prescriptions',
        },
        {
          label: 'Aspheric (Thinner, flatter design for higher powers)',
          value: 'ASPHERIC',
          surcharge: 500,
          showIfParent: ['SINGLE_VISION'],
          description: 'Flatter front curve minimizing eye magnification and distortion',
        },
        // If Bifocal:
        {
          label: 'Kryptok (K Bifocal) (Round segment)',
          value: 'KRYPTOK',
          surcharge: 0,
          showIfParent: ['BIFOCAL'],
          description: 'Classic round reading segment with smooth optical boundary',
        },
        {
          label: 'D-Bifocal (Flat-Top) (D-shaped segment)',
          value: 'D_BIFOCAL',
          surcharge: 300,
          showIfParent: ['BIFOCAL'],
          description: '28mm flat-top reading window reducing image jump',
        },
        {
          label: 'Executive / Solid (Full line across the lens)',
          value: 'EXECUTIVE',
          surcharge: 600,
          showIfParent: ['BIFOCAL'],
          description: 'Full-width lower segment for maximal reading and drafting breadth',
        },
        // If Progressive (PAL):
        {
          label: 'Standard Progressive (Basic corridor)',
          value: 'STANDARD_PAL',
          surcharge: 0,
          showIfParent: ['PROGRESSIVE'],
          description: 'Reliable entry-level multifocal corridor',
        },
        {
          label: 'Digital / Freeform PAL (Sharper, customized)',
          value: 'DIGITAL_FREEFORM',
          surcharge: 800,
          showIfParent: ['PROGRESSIVE'],
          description: 'Point-by-point back surface digital ray-tracing optimization',
        },
        {
          label: 'Wider Corridor / Premium (Expanded field of view, less side distortion)',
          value: 'WIDER_CORRIDOR',
          surcharge: 1500,
          showIfParent: ['PROGRESSIVE'],
          description: 'Ultra-wide progressive channel with reduced peripheral swim effect',
        },
        {
          label: 'Office / Indoor PAL (Optimized for computer and desk work)',
          value: 'OFFICE_INDOOR',
          surcharge: 1000,
          showIfParent: ['PROGRESSIVE'],
          description: 'Dedicated intermediate and near zones for screen and office ergonomics',
        },
      ],
    },
    // Step 3: Select Material & Index (Thinner Lenses)
    {
      id: 'step_material_index',
      stepName: 'Select Material & Index',
      inputType: 'single_select',
      options: [
        {
          label: 'Standard Plastic (1.50 Index)',
          value: 'PLASTIC_150',
          surcharge: 0,
          description: 'Standard optical resin suitable for lower prescriptions up to ±2.00',
        },
        {
          label: 'Mid-Index (1.56 / 1.61 Index)',
          value: 'MID_INDEX_156',
          surcharge: 450,
          description: '20% thinner and lighter for moderate powers up to ±4.00',
        },
        {
          label: 'Hi-Index (1.67 / 1.74 Index - for high powers)',
          value: 'HI_INDEX_167',
          surcharge: 1600,
          description: 'Ultra-slim lightweight profile for prescriptions above ±4.00',
        },
        {
          label: 'Polycarbonate / Trivex (Unbreakable for kids or rimless frames)',
          value: 'POLY_TRIVEX',
          surcharge: 950,
          description: 'High-impact shatterproof material ideal for drill rimless & sports',
        },
      ],
    },
    // Step 4: Select Coating & Treatments (Add-ons)
    {
      id: 'step_coatings',
      stepName: 'Select Coating & Treatments',
      inputType: 'multi_select',
      options: [
        {
          label: 'Hard Coat (Scratch-resistant)',
          value: 'HARD_COAT',
          surcharge: 250,
          description: 'Durable thermally cured lacquer protecting against abrasive scratches',
        },
        {
          label: 'Anti-Reflection Coating (ARC) (Anti-glare)',
          value: 'ARC_COATING',
          surcharge: 450,
          description: 'Multi-layer anti-reflective stack eliminating glare and reflections',
        },
        {
          label: 'Blue Light Cut (Digital screen protection)',
          value: 'BLUE_LIGHT_CUT',
          surcharge: 750,
          description: 'High-energy visible (HEV) blue filter reducing digital eye strain',
        },
        {
          label: 'Photochromic / Transition (Changes color in sunlight)',
          value: 'PHOTOCHROMIC',
          surcharge: 1400,
          description: 'UV-activated photochromic dyes darkening outdoors and clearing indoors',
        },
      ],
    },
  ];

  // ─────────────────────────────────────────────────────────────
  // 3. SUNGLASSES
  // ─────────────────────────────────────────────────────────────
  const sunglassSteps: WorkflowStep[] = [
    {
      id: 'step_sunglass_type',
      stepName: 'Select Sunglasses Type',
      inputType: 'single_select',
      options: [
        { label: 'Polarized Sunglasses', value: 'POLARIZED', surcharge: 500, description: 'Eliminates blinding reflective glare from roads & water' },
        { label: 'Non-Polarized Sunglasses', value: 'NON_POLARIZED', surcharge: 0, description: 'Standard 100% UV400 fashion and sun protection' },
        { label: 'Prescription Sunglasses', value: 'PRESCRIPTION_SUN', surcharge: 800, description: 'Custom optical power integrated with deep solar tint' },
      ],
    },
    {
      id: 'step_sunglass_tint',
      stepName: 'Lens Tint & Protection',
      inputType: 'single_select',
      options: [
        { label: 'Solid Dark (Black / Brown / G-15 Green)', value: 'SOLID_TINT', surcharge: 0, description: 'Uniform 85% light reduction across the lens' },
        { label: 'Gradient Tint (Dual shade aesthetic)', value: 'GRADIENT_TINT', surcharge: 300, description: 'Dark on top transitioning to lighter at the bottom' },
        { label: 'Flash Mirror Silver/Blue Coating', value: 'MIRROR_COATING', surcharge: 600, description: 'Reflective mirror finish providing extra solar bounce' },
      ],
    },
  ];

  // ─────────────────────────────────────────────────────────────
  // 4. CONTACT LENSES
  // ─────────────────────────────────────────────────────────────
  const contactLensSteps: WorkflowStep[] = [
    {
      id: 'step_cl_modality',
      stepName: 'Modality & Lens Type',
      inputType: 'single_select',
      options: [
        { label: 'Daily Disposables', value: 'DAILY_DISPOSABLE', surcharge: 0, description: 'Single-use fresh lens daily; zero maintenance or solution needed' },
        { label: 'Monthly Disposables', value: 'MONTHLY_DISPOSABLE', surcharge: 200, description: 'Cost-effective 30-day lens cleaned overnight in case' },
        { label: 'Color Contact Lenses', value: 'COLOR_LENSES', surcharge: 400, description: 'Cosmetic iris tint available in zero power and prescription' },
        { label: 'Toric / Astigmatism Lenses', value: 'TORIC_ASTIGMATISM', surcharge: 600, description: 'Prism ballast stabilized lenses correcting astigmatism' },
      ],
    },
    {
      id: 'step_cl_pack',
      stepName: 'Pack Size / Supply',
      inputType: 'single_select',
      options: [
        { label: 'Trial / Small Pack (2-3 lenses)', value: 'TRIAL_PACK', surcharge: 0, description: 'Starter blister pack for trial fitting' },
        { label: 'Monthly Supply Box (30-day wear)', value: 'MONTH_SUPPLY', surcharge: 350, description: 'Standard 6-pack or 30-pack box' },
        { label: 'Multi-Month Economic Bundle (90-day wear)', value: 'BUNDLE_SUPPLY', surcharge: 850, description: 'Value bundle with complimentary solution' },
      ],
    },
  ];

  // ─────────────────────────────────────────────────────────────
  // 5. BLUE LIGHT / COMPUTER GLASSES (PRESET DISPENSING)
  // ─────────────────────────────────────────────────────────────
  const blueCutSteps: WorkflowStep[] = [
    {
      id: 'step_bluecut_power',
      stepName: 'Lens Power Mode',
      inputType: 'single_select',
      options: [
        { label: 'Zero Power Plano (Screen Filter Only)', value: 'PLANO', surcharge: 0, description: 'Pre-calibrated blue cut for non-prescription device users' },
        { label: 'Prescription Blue-Cut (Single Vision)', value: 'PRESCRIPTION_SV', surcharge: 400, description: 'Custom refraction power paired with blue shield' },
        { label: 'Progressive Blue-Filter (Multi-Distance)', value: 'PROGRESSIVE_BLUE', surcharge: 1500, description: 'Presbyopia progressive corridor with blue light blocker' },
      ],
    },
    {
      id: 'step_bluecut_tech',
      stepName: 'Blue Filter Technology',
      inputType: 'single_select',
      options: [
        { label: 'Standard Blue-Shield (420nm Filter)', value: 'STANDARD_SHIELD', surcharge: 0, description: 'Subtle yellow-tint coating absorbing harsh blue rays' },
        { label: 'TrueColor Clarity Blue-Block (No Yellow Tint)', value: 'TRUE_COLOR', surcharge: 350, description: 'In-monomer crystal clear blue absorption technology' },
        { label: 'Night Driving + Digital Dual Guard', value: 'DUAL_GUARD', surcharge: 600, description: 'Enhanced anti-glare for OLED screens and LED headlights' },
      ],
    },
  ];

  // ─────────────────────────────────────────────────────────────
  // 6. LENS ONLY (CUSTOMER FRAME RE-GLAZE)
  // ─────────────────────────────────────────────────────────────
  const lensOnlySteps: WorkflowStep[] = [
    {
      id: 'step_lens_only_focus',
      stepName: 'Lens Focus Type',
      inputType: 'single_select',
      options: [
        { label: 'Single Vision (Distance / Reading / Plano)', value: 'SINGLE_VISION', surcharge: 0, description: 'Precision single power cut to customer frame' },
        { label: 'Bifocal (Kryptok / Flat-Top D)', value: 'BIFOCAL', surcharge: 500, description: 'Dual focus with custom reading segment fitting' },
        { label: 'Progressive (PAL) (No-line multifocal)', value: 'PROGRESSIVE', surcharge: 1200, description: 'Digital corridor measured to frame fitting height' },
      ],
    },
    {
      id: 'step_reglaze_condition',
      stepName: 'Customer Frame Condition',
      inputType: 'single_select',
      options: [
        { label: 'Frame Inspected & Sound (Standard Edging)', value: 'SOUND_FRAME', surcharge: 0, description: 'Frame structure verified sound for automated edging' },
        { label: 'Screw Replacement & Ultrasonic Clean', value: 'SERVICE_TUNEUP', surcharge: 100, description: 'Re-tightening, ultrasonic bath, and fresh nose pads' },
        { label: 'Delicate Vintage Frame (Extra Lab Care)', value: 'DELICATE_FRAME', surcharge: 250, description: 'Specialized low-pressure bevel edging for fragile frames' },
      ],
    },
  ];

  // ─────────────────────────────────────────────────────────────
  // 7. ACCESSORIES & SOLUTIONS
  // ─────────────────────────────────────────────────────────────
  const accessorySteps: WorkflowStep[] = [
    {
      id: 'step_accessory_type',
      stepName: 'Product Classification',
      inputType: 'single_select',
      options: [
        { label: 'Contact Lens Solutions', value: 'CL_SOLUTIONS', surcharge: 0, description: 'Multi-purpose disinfecting and hydrating solutions' },
        { label: 'Lens Cleaning Sprays & Wipes', value: 'CLEANING_SPRAYS_WIPES', surcharge: 0, description: 'Streak-free anti-fog sprays and microfiber cloth packs' },
        { label: 'Eyeglass Cases & Cords', value: 'CASES_CORDS', surcharge: 0, description: 'Protective hard-shell cases and retention sports cords' },
      ],
    },
    {
      id: 'step_accessory_pack',
      stepName: 'Packaging Option',
      inputType: 'single_select',
      options: [
        { label: 'Standard Single Unit', value: 'SINGLE_UNIT', surcharge: 0, description: 'Individual retail item' },
        { label: 'Travel Size Kit (Under 100ml)', value: 'TRAVEL_SIZE', surcharge: 50, description: 'TSA compliant travel bottle and compact case' },
        { label: 'Value Family Combo Pack', value: 'COMBO_PACK', surcharge: 120, description: 'Multi-pack bundle with savings' },
      ],
    },
  ];

  // ─────────────────────────────────────────────────────────────
  // 8. SERVICES (OPTOMETRY & WORKSHOP CHARGES)
  // ─────────────────────────────────────────────────────────────
  const serviceSteps: WorkflowStep[] = [
    {
      id: 'step_service_type',
      stepName: 'Service Type',
      inputType: 'single_select',
      options: [
        { label: 'Eye Testing / Optometrist Fee', value: 'OPTOMETRIST_FEE', surcharge: 0, description: 'Comprehensive subjective & objective refractive exam' },
        { label: 'Frame Repair / Lens Fitting Charges', value: 'REPAIR_FITTING_CHARGES', surcharge: 100, description: 'Workshop manual beveling, soldering or temple alignment' },
        { label: 'Nose Pad & Screw Replacement Service', value: 'PARTS_ADJUSTMENT', surcharge: 50, description: 'Silicon air-cushion nose pads & anti-slip temple tips' },
      ],
    },
    {
      id: 'step_service_level',
      stepName: 'Urgency / Service Level',
      inputType: 'single_select',
      options: [
        { label: 'Standard Turnaround', value: 'STANDARD_SERVICE', surcharge: 0, description: 'Regular queue (same-day or next-day turnaround)' },
        { label: 'Express Priority Lab Fitting', value: 'EXPRESS_FITTING', surcharge: 150, description: 'Immediate 1-hour fast-track workshop glazing' },
      ],
    },
  ];

  return [
    {
      code: 'FRAME',
      name: 'Spectacle Frames (or Eyeglasses)',
      description: "Men's, Women's, Kids' Frames and Reading Glasses",
      icon: 'Glasses',
      basePrice: '1200.00',
      isSystemDefault: true,
      isEnabled: true,
      displayOrder: 1,
      requiresFrame: false,
      requiresPrescription: false,
      workflowSteps: frameSteps,
    },
    {
      code: 'LENS',
      name: 'Spectacle Lenses',
      description: 'Single Vision, Bifocal, Progressive (PAL), Computer & Transition Lenses',
      icon: 'Layers',
      basePrice: '800.00',
      isSystemDefault: true,
      isEnabled: true,
      displayOrder: 2,
      requiresFrame: true,
      requiresPrescription: true,
      workflowSteps: lensSteps,
    },
    {
      code: 'BLUE_CUT',
      name: 'Blue Light / Computer Glasses',
      description: 'Digital screen protection glasses with anti-glare blue filter',
      icon: 'Monitor',
      basePrice: '1800.00',
      isSystemDefault: true,
      isEnabled: true,
      displayOrder: 3,
      requiresFrame: true,
      requiresPrescription: false,
      workflowSteps: blueCutSteps,
    },
    {
      code: 'SUNGLASS',
      name: 'Sunglasses',
      description: 'Polarized, Non-Polarized and Prescription designer sunglasses',
      icon: 'Sun',
      basePrice: '1500.00',
      isSystemDefault: true,
      isEnabled: true,
      displayOrder: 4,
      requiresFrame: false,
      requiresPrescription: false,
      workflowSteps: sunglassSteps,
    },
    {
      code: 'CONTACT_LENS',
      name: 'Contact Lenses',
      description: 'Daily Disposables, Monthly Disposables, Color & Toric astigmatism lenses',
      icon: 'Eye',
      basePrice: '900.00',
      isSystemDefault: true,
      isEnabled: true,
      displayOrder: 5,
      requiresFrame: false,
      requiresPrescription: true,
      workflowSteps: contactLensSteps,
    },
    {
      code: 'LENS_ONLY',
      name: 'Lens Only (Customer Frame)',
      description: 'Customer brings own frame; re-glaze with new precision lenses',
      icon: 'Layers',
      basePrice: '800.00',
      isSystemDefault: true,
      isEnabled: true,
      displayOrder: 6,
      requiresFrame: false,
      requiresPrescription: true,
      workflowSteps: lensOnlySteps,
    },
    {
      code: 'ACCESSORY',
      name: 'Accessories & Solutions',
      description: 'Contact lens solutions, cleaning sprays, wipes, cases & cords',
      icon: 'Package',
      basePrice: '250.00',
      isSystemDefault: true,
      isEnabled: true,
      displayOrder: 7,
      requiresFrame: false,
      requiresPrescription: false,
      workflowSteps: accessorySteps,
    },
    {
      code: 'SERVICE',
      name: 'Services & Professional Fees',
      description: 'Eye testing, optometrist exams, frame repairs & lens fitting charges',
      icon: 'ShieldCheck',
      basePrice: '200.00',
      isSystemDefault: true,
      isEnabled: true,
      displayOrder: 8,
      requiresFrame: false,
      requiresPrescription: false,
      workflowSteps: serviceSteps,
    },
  ];
}

/**
 * Seeds or ensures default product types and workflow schemas exist for a specific organization.
 * Called automatically when creating a new branch, onboarding a practice, or creating an organization.
 * Updates system defaults to the latest workflow steps while preserving custom merchant additions.
 *
 * @param organizationId - UUID of the organization
 */
export async function seedDefaultProductTypesForOrganization(organizationId: string): Promise<void> {
  if (!organizationId) return;

  const defaultConfigs = getDefaultProductTypesConfig();

  for (const conf of defaultConfigs) {
    const existing = await db
      .select({ id: productTypes.id, isSystemDefault: productTypes.isSystemDefault })
      .from(productTypes)
      .where(
        sql`${productTypes.organizationId} = ${organizationId} AND ${productTypes.code} = ${conf.code}`
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(productTypes).values({
        organizationId,
        code: conf.code,
        name: conf.name,
        description: conf.description,
        icon: conf.icon,
        basePrice: conf.basePrice,
        isSystemDefault: conf.isSystemDefault,
        isEnabled: conf.isEnabled,
        displayOrder: conf.displayOrder,
        requiresFrame: conf.requiresFrame,
        requiresPrescription: conf.requiresPrescription,
        workflowSteps: conf.workflowSteps,
      });
    } else if (existing[0].isSystemDefault) {
      // Update system defaults to ensure practice has the latest authoritative workflow steps & structure
      await db
        .update(productTypes)
        .set({
          name: conf.name,
          description: conf.description,
          icon: conf.icon,
          basePrice: conf.basePrice,
          displayOrder: conf.displayOrder,
          requiresFrame: conf.requiresFrame,
          requiresPrescription: conf.requiresPrescription,
          workflowSteps: conf.workflowSteps,
          updatedAt: new Date(),
        })
        .where(sql`${productTypes.id} = ${existing[0].id}`);
    }
  }
}
