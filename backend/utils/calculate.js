/**
 * Deterministic paver quantity + brass calculator.
 * This is the ONLY source of truth for the math — the AI assistant
 * (routes/ai.js) is only ever allowed to *explain* numbers produced here,
 * never invent its own.
 *
 * All inputs are normalized to millimeters internally so land units (ft/m)
 * and block units (mm) combine correctly.
 */

const FT_TO_MM = 304.8;
const M_TO_MM = 1000;
const INCH_TO_MM = 25.4;

function toMillimeters(value, unit) {
  switch (unit) {
    case 'ft':
      return value * FT_TO_MM;
    case 'm':
      return value * M_TO_MM;
    default:
      throw new Error(`Unsupported unit: ${unit}`);
  }
}

/**
 * @param {Object} params
 * @param {number} params.length        Land length
 * @param {number} params.width         Land width
 * @param {string} params.unit          'ft' | 'm'
 * @param {number} params.blockLength   Block length in mm
 * @param {number} params.blockWidth    Block width in mm
 * @param {number} [params.wastage]     Wastage percentage (default 0)
 * @param {number} [params.depth]       Optional base/material depth in inches
 */
function calculateQuantity({ length, width, unit, blockLength, blockWidth, wastage = 0, depth }) {
  // --- Validation ---
  const errors = [];
  if (!(length > 0)) errors.push('length must be a positive number');
  if (!(width > 0)) errors.push('width must be a positive number');
  if (!['ft', 'm'].includes(unit)) errors.push("unit must be 'ft' or 'm'");
  if (!(blockLength > 0)) errors.push('blockLength must be a positive number (mm)');
  if (!(blockWidth > 0)) errors.push('blockWidth must be a positive number (mm)');
  if (wastage < 0 || wastage > 100) errors.push('wastage must be between 0 and 100');
  if (depth !== undefined && depth !== null && depth !== '' && !(depth >= 0)) {
    errors.push('depth must be a non-negative number (inches)');
  }
  if (errors.length) {
    const err = new Error('Invalid calculator input');
    err.details = errors;
    err.status = 400;
    throw err;
  }

  // --- Normalize land dimensions to mm ---
  const lengthMm = toMillimeters(length, unit);
  const widthMm = toMillimeters(width, unit);

  // --- Core area/block math (mm^2) ---
  const landAreaMm2 = lengthMm * widthMm;
  const blockAreaMm2 = blockLength * blockWidth;
  const basicBlocks = landAreaMm2 / blockAreaMm2;
  const wastageMultiplier = 1 + (Number(wastage) || 0) / 100;
  const recommendedBlocksExact = basicBlocks * wastageMultiplier;
  const recommendedBlocks = Math.ceil(recommendedBlocksExact);

  // --- Human-friendly land area (sq ft and sq m) ---
  const landAreaSqFt = (lengthMm / FT_TO_MM) * (widthMm / FT_TO_MM);
  const landAreaSqM = (lengthMm / M_TO_MM) * (widthMm / M_TO_MM);

  // --- Optional brass/volume estimate ---
  let estimatedVolumeM3 = null;
  let estimatedBrass = null;
  if (depth !== undefined && depth !== null && depth !== '') {
    const depthMm = Number(depth) * INCH_TO_MM;
    const volumeMm3 = landAreaMm2 * depthMm;
    estimatedVolumeM3 = volumeMm3 / 1_000_000_000; // mm^3 -> m^3
    // 1 Brass (India, construction) = 100 cubic feet = 2.8316846592 m^3
    const BRASS_TO_M3 = 2.8316846592;
    estimatedBrass = estimatedVolumeM3 / BRASS_TO_M3;
  }

  return {
    landAreaSqFt: round(landAreaSqFt, 2),
    landAreaSqM: round(landAreaSqM, 2),
    blockAreaMm2: round(blockAreaMm2, 2),
    basicBlocks: round(basicBlocks, 0),
    wastagePercent: Number(wastage) || 0,
    recommendedBlocks,
    estimatedVolumeM3: estimatedVolumeM3 !== null ? round(estimatedVolumeM3, 3) : null,
    estimatedBrass: estimatedBrass !== null ? round(estimatedBrass, 3) : null,
    note: 'Final material quantity may vary depending on site conditions, laying pattern, joint spacing, base preparation and wastage. Please confirm with the Paras Pavers team before ordering.'
  };
}

function round(num, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

module.exports = { calculateQuantity };
