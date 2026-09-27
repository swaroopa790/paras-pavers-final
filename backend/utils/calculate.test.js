/**
 * Unit tests for the paver quantity calculator.
 * Run with: node backend/utils/calculate.test.js
 */
const { calculateQuantity } = require('./calculate');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  assert(actual === expected, `${message} (expected ${expected}, got ${actual})`);
}

function assertThrows(fn, expectedStatus, message) {
  try {
    fn();
    failed++;
    console.error(`  FAIL: ${message} — did not throw`);
  } catch (err) {
    assertEqual(err.status, expectedStatus, message);
  }
}

console.log('=== Calculator Unit Tests ===\n');

// --- Basic calculation ---
console.log('Basic calculation (50ft x 30ft, 200x100mm block):');
const r1 = calculateQuantity({ length: 50, width: 30, unit: 'ft', blockLength: 200, blockWidth: 100, wastage: 5 });
assertEqual(r1.landAreaSqFt, 1500, 'Land area in sq.ft');
assertEqual(r1.landAreaSqM, 139.35, 'Land area in sq.m');
assertEqual(r1.basicBlocks, 6968, 'Basic blocks');
assertEqual(r1.recommendedBlocks, 7317, 'Recommended blocks with 5% wastage');
assertEqual(r1.wastagePercent, 5, 'Wastage percent');
assert(r1.estimatedBrass === null, 'Brass is null when no depth given');

// --- Metric units ---
console.log('\nMetric units (15m x 9m, 200x100mm block):');
const r2 = calculateQuantity({ length: 15, width: 9, unit: 'm', blockLength: 200, blockWidth: 100 });
assertEqual(r2.landAreaSqM, 135, 'Land area in sq.m');
assertEqual(r2.landAreaSqFt, 1453.13, 'Land area in sq.ft');

// --- With depth (brass calculation) ---
console.log('\nWith depth (4 inches):');
const r3 = calculateQuantity({ length: 50, width: 30, unit: 'ft', blockLength: 200, blockWidth: 100, wastage: 5, depth: 4 });
assert(r3.estimatedVolumeM3 !== null, 'Volume is calculated');
assert(r3.estimatedBrass !== null, 'Brass is calculated');
assert(r3.estimatedBrass > 0, 'Brass is positive');

// --- Zero wastage ---
console.log('\nZero wastage:');
const r4 = calculateQuantity({ length: 10, width: 10, unit: 'ft', blockLength: 200, blockWidth: 100, wastage: 0 });
assertEqual(r4.basicBlocks, r4.recommendedBlocks, 'No wastage means basic = recommended');

// --- Validation errors ---
console.log('\nValidation errors:');
assertThrows(() => calculateQuantity({ length: -5, width: 30, unit: 'ft', blockLength: 200, blockWidth: 100 }), 400, 'Negative length');
assertThrows(() => calculateQuantity({ length: 50, width: 30, unit: 'cm', blockLength: 200, blockWidth: 100 }), 400, 'Invalid unit');
assertThrows(() => calculateQuantity({ length: 50, width: 30, unit: 'ft', blockLength: 0, blockWidth: 100 }), 400, 'Zero block length');
assertThrows(() => calculateQuantity({ length: 50, width: 30, unit: 'ft', blockLength: 200, blockWidth: 100, wastage: 101 }), 400, 'Wastage > 100');
assertThrows(() => calculateQuantity({ length: 50, width: 30, unit: 'ft', blockLength: 200, blockWidth: 100, depth: -1 }), 400, 'Negative depth');

// --- Edge cases ---
console.log('\nEdge cases:');
const r5 = calculateQuantity({ length: 0.01, width: 0.01, unit: 'm', blockLength: 1, blockWidth: 1 });
assert(r5.recommendedBlocks >= 1, 'Minimum 1 block for tiny area');

const r6 = calculateQuantity({ length: 1000, width: 1000, unit: 'm', blockLength: 200, blockWidth: 100, wastage: 10 });
assert(r6.recommendedBlocks > 0, 'Large area produces positive block count');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
