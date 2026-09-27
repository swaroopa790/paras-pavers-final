const pool = require('../config/db');
const { calculateQuantity } = require('../utils/calculate');

// POST /api/calculate-quantity
async function calculate(req, res, next) {
  try {
    const { length, width, unit, blockLength, blockWidth, wastage, depth, productId } = req.body || {};

    const result = calculateQuantity({
      length: Number(length),
      width: Number(width),
      unit,
      blockLength: Number(blockLength),
      blockWidth: Number(blockWidth),
      wastage: wastage !== undefined ? Number(wastage) : 0,
      depth: depth !== undefined && depth !== '' ? Number(depth) : undefined
    });

    // Persist the calculation (best-effort — don't fail the response if this errors).
    // Use numeric values (not raw req.body strings) for DECIMAL columns.
    try {
      await pool.query(
        `INSERT INTO quantity_calculations
         (product_id, length, width, unit, block_length, block_width, wastage, depth, land_area, estimated_blocks, estimated_brass)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productId ? Number(productId) : null,
          Number(length),
          Number(width),
          unit,
          Number(blockLength),
          Number(blockWidth),
          wastage !== undefined ? Number(wastage) : 0,
          depth !== undefined && depth !== '' ? Number(depth) : null,
          result.landAreaSqFt,
          result.recommendedBlocks,
          result.estimatedBrass
        ]
      );
    } catch (dbErr) {
      console.error('[WARN] Failed to persist calculation:', dbErr.message);
    }

    res.json({
      success: true,
      landArea: `${result.landAreaSqFt} sq.ft (${result.landAreaSqM} sq.m)`,
      blockArea: `${result.blockAreaMm2} mm²`,
      basicBlocks: result.basicBlocks,
      wastageBlocks: result.recommendedBlocks - result.basicBlocks,
      recommendedBlocks: result.recommendedBlocks,
      estimatedVolume: result.estimatedVolumeM3 !== null ? `${result.estimatedVolumeM3} m³` : null,
      estimatedBrass: result.estimatedBrass !== null ? result.estimatedBrass : null,
      message: result.note
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { calculate };
