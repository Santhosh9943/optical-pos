/**
 * @file vertex-converter.ts
 * @description Clinical Corneal Vertex Distance Power Converter for Optical POS & Practice Management.
 * Implements the standard optical vertex equation:
 *   F_CL = F_spec / (1 - (d * F_spec))
 * where:
 *   d = corneal vertex distance in meters (standard: 12mm = 0.012m)
 *   F_spec = spectacle lens power in Diopters (D)
 *   F_CL = effective contact lens power at the corneal plane
 */

import { isQuarterStep } from './validators/prescription';
import type { PrescriptionValues } from '@/components/pos/prescription-grid';

export interface ConvertedEyePower {
  rawSphere: number | null;
  rawCylinder: number | null;
  rawAxis: number | null;
  clSphere: number | null;
  clCylinder: number | null;
  clAxis: number | null;
  sphericalEquivalent: number | null;
  clSphericalEquivalent: number | null;
  isToricRecommended: boolean;
  formattedClPower: string;
  formattedSphericalEquivalent: string;
}

export interface ConvertedPrescriptionResult {
  vertexDistanceMm: number;
  od: ConvertedEyePower;
  os: ConvertedEyePower;
  notes: string[];
}

/**
 * Rounds a floating diopter to the nearest 0.25 D step with integer scaling
 * @param val - Floating diopter value
 * @returns Rounded diopter in exact 0.25 D multiple
 */
export function roundToQuarterStep(val: number): number {
  if (isNaN(val)) return 0;
  const quarterSteps = Math.round(val * 4);
  const rounded = quarterSteps / 4;
  // Ensure -0.00 is returned as 0
  return rounded === 0 ? 0 : Math.round(rounded * 100) / 100;
}

/**
 * Converts spectacle lens power (D) to corneal plane contact lens power (D)
 * using the classic vertex distance equation:
 * F_cl = F_spec / (1 - d * F_spec)
 *
 * @param spectacleDiopter - Spectacle dioptric power
 * @param vertexDistanceMm - Corneal vertex distance in millimeters (default: 12mm)
 * @returns Exact unrounded contact lens power
 */
export function vertexConvert(
  spectacleDiopter: number,
  vertexDistanceMm: number = 12
): number {
  if (spectacleDiopter === 0 || isNaN(spectacleDiopter)) return 0;
  const d = vertexDistanceMm / 1000; // convert mm to meters
  const denominator = 1 - d * spectacleDiopter;
  if (Math.abs(denominator) < 0.0001) return spectacleDiopter; // Guard against asymptote
  return spectacleDiopter / denominator;
}

/**
 * Calculates Spherical Equivalent: SE = Sphere + (Cylinder / 2)
 * @param sphere - Sphere power (D)
 * @param cylinder - Cylinder power (D)
 * @returns Unrounded Spherical Equivalent
 */
export function calculateSphericalEquivalent(sphere: number, cylinder: number): number {
  const sph = isNaN(sphere) ? 0 : sphere;
  const cyl = isNaN(cylinder) ? 0 : cylinder;
  return sph + cyl / 2;
}

/**
 * Formats a diopter value with sign and 2 decimal places (e.g., +2.25, -4.50, 0.00)
 */
export function formatDiopter(val: number | null): string {
  if (val === null || isNaN(val)) return '0.00';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}`;
}

/**
 * Converts a single eye's spectacle refraction (Sphere, Cylinder, Axis) to contact lens power
 *
 * @param sphere - Spectacle sphere power
 * @param cylinder - Spectacle cylinder power
 * @param axis - Spectacle cylinder axis (1-180)
 * @param options - Conversion parameters (vertexDistanceMm, useSphericalEquivalent)
 */
export function convertSingleEyePower(
  sphere: number | null,
  cylinder: number | null,
  axis: number | null,
  options: {
    vertexDistanceMm?: number;
    useSphericalEquivalent?: boolean;
  } = {}
): ConvertedEyePower {
  const vertexMm = options.vertexDistanceMm ?? 12;
  const sph = sphere ?? 0;
  const cyl = cylinder ?? 0;
  const ax = axis ?? null;

  // 1. Calculate raw spherical equivalent
  const se = calculateSphericalEquivalent(sph, cyl);
  const seQuarter = roundToQuarterStep(se);

  // 2. Vertex-converted spherical equivalent
  const clSeExact = vertexConvert(se, vertexMm);
  const clSeQuarter = roundToQuarterStep(clSeExact);

  // 3. Principal meridians conversion for toric contact lenses:
  // Meridian 1: Power along spherical meridian = Sph
  // Meridian 2: Power along cylindrical meridian = Sph + Cyl
  const m1 = sph;
  const m2 = sph + cyl;

  const clM1Exact = vertexConvert(m1, vertexMm);
  const clM2Exact = vertexConvert(m2, vertexMm);

  const clSphQuarter = roundToQuarterStep(clM1Exact);
  const clCylQuarter = roundToQuarterStep(clM2Exact - clM1Exact);

  // Astigmatism >= 0.75 D typically benefits from toric contact lenses
  const isToricRecommended = Math.abs(cyl) >= 0.75;

  let formattedClPower = '';
  if (Math.abs(clCylQuarter) >= 0.75 && ax !== null) {
    formattedClPower = `${formatDiopter(clSphQuarter)} / ${formatDiopter(clCylQuarter)} × ${ax}°`;
  } else {
    // If cylinder is low or spherical equivalent is preferred
    formattedClPower = `${formatDiopter(options.useSphericalEquivalent ? clSeQuarter : clSphQuarter)} D`;
  }

  return {
    rawSphere: sphere,
    rawCylinder: cylinder,
    rawAxis: axis,
    clSphere: clSphQuarter,
    clCylinder: Math.abs(clCylQuarter) >= 0.25 ? clCylQuarter : null,
    clAxis: Math.abs(clCylQuarter) >= 0.25 ? ax : null,
    sphericalEquivalent: seQuarter,
    clSphericalEquivalent: clSeQuarter,
    isToricRecommended,
    formattedClPower,
    formattedSphericalEquivalent: `${formatDiopter(clSeQuarter)} D`,
  };
}

/**
 * Converts a full clinical prescription (OD and OS) to contact lens powers
 *
 * @param rx - Full clinical prescription values
 * @param options - Conversion parameters
 * @returns Converted OD/OS contact lens powers and dispensing notes
 */
export function convertSpectacleToContactLens(
  rx: PrescriptionValues,
  options: {
    vertexDistanceMm?: number;
    useSphericalEquivalent?: boolean;
  } = {}
): ConvertedPrescriptionResult {
  const vertexDistanceMm = options.vertexDistanceMm ?? 12;

  const od = convertSingleEyePower(
    rx.odSphere,
    rx.odCylinder,
    rx.odAxis,
    { vertexDistanceMm, useSphericalEquivalent: options.useSphericalEquivalent }
  );

  const os = convertSingleEyePower(
    rx.osSphere,
    rx.osCylinder,
    rx.osAxis,
    { vertexDistanceMm, useSphericalEquivalent: options.useSphericalEquivalent }
  );

  const notes: string[] = [];

  // Clinical alerts for dispensing optometrist
  if (
    (rx.odSphere !== null && Math.abs(rx.odSphere) >= 4.0) ||
    (rx.osSphere !== null && Math.abs(rx.osSphere) >= 4.0)
  ) {
    notes.push(
      `Vertex distance effect significant (≥ ±4.00 D at ${vertexDistanceMm}mm corneal apex). Contact lens power adjusted.`
    );
  }

  if (od.isToricRecommended || os.isToricRecommended) {
    notes.push(
      'Astigmatism ≥ 0.75 D detected: Toric soft contact lenses recommended for optimal visual acuity.'
    );
  }

  if (rx.odAdd || rx.osAdd) {
    notes.push(
      'Presbyopia (ADD power) noted: Consider multifocal contact lenses or monovision fit.'
    );
  }

  return {
    vertexDistanceMm,
    od,
    os,
    notes,
  };
}
