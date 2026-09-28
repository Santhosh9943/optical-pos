import {
  vertexConvert,
  roundToQuarterStep,
  calculateSphericalEquivalent,
  convertSingleEyePower,
  convertSpectacleToContactLens,
} from '../src/lib/vertex-converter';
import { isQuarterStep } from '../src/lib/validators/prescription';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
}

console.log('Testing Vertex Distance Converter Engine...');

// 1. Basic vertex conversion formula
// -5.00 D with 12mm vertex: -5 / (1 - 0.012 * -5) = -5 / 1.06 ≈ -4.71698 D -> rounds to -4.75 D
const myopicExact = vertexConvert(-5.0, 12);
assert(Math.abs(myopicExact - -4.71698) < 0.001, 'Vertex conversion for -5.00 D at 12mm is approx -4.717 D');
const myopicQuarter = roundToQuarterStep(myopicExact);
assert(myopicQuarter === -4.75, '-4.717 D rounds to -4.75 D quarter step');
assert(isQuarterStep(myopicQuarter), '-4.75 D satisfies 0.25 D invariant');

// +5.00 D with 12mm vertex: +5 / (1 - 0.012 * 5) = 5 / 0.94 ≈ +5.3191 D -> rounds to +5.25 D
const hyperopicExact = vertexConvert(5.0, 12);
assert(Math.abs(hyperopicExact - 5.3191) < 0.001, 'Vertex conversion for +5.00 D at 12mm is approx +5.319 D');
const hyperopicQuarter = roundToQuarterStep(hyperopicExact);
assert(hyperopicQuarter === 5.25, '+5.319 D rounds to +5.25 D quarter step');
assert(isQuarterStep(hyperopicQuarter), '+5.25 D satisfies 0.25 D invariant');

// 2. Low power (under 4.00 D) should have negligible vertex change
const lowPower = vertexConvert(-2.0, 12);
assert(roundToQuarterStep(lowPower) === -2.0, '-2.00 D remains -2.00 D after vertex adjustment');

// 3. Spherical Equivalent calculation
const se = calculateSphericalEquivalent(-3.0, -1.0);
assert(se === -3.5, 'SE of -3.00 / -1.00 is -3.50');

// 4. Single eye conversion
const eyeResult = convertSingleEyePower(-5.0, -1.5, 90, { vertexDistanceMm: 12 });
assert(eyeResult.clSphere === -4.75, 'OD sphere converted from -5.00 to -4.75');
assert(eyeResult.isToricRecommended === true, 'Toric contact lens recommended for cyl -1.50');
assert(isQuarterStep(eyeResult.clSphere!), 'clSphere satisfies 0.25 D invariant');

// 5. Full prescription conversion
const fullResult = convertSpectacleToContactLens({
  odSphere: -6.0,
  odCylinder: -1.0,
  odAxis: 180,
  odAdd: 1.5,
  odPd: 31.5,
  osSphere: -5.5,
  osCylinder: -0.5,
  osAxis: 175,
  osAdd: 1.5,
  osPd: 31.5,
  binocularPd: 63.0,
});

assert(fullResult.od.clSphere !== null, 'Full OD sphere calculated');
assert(fullResult.os.clSphere !== null, 'Full OS sphere calculated');
assert(fullResult.notes.length >= 2, 'Clinical notes generated for high power and presbyopia');

console.log('All Vertex Distance Converter Engine tests passed successfully!');
