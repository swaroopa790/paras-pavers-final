const { calculateQuantity } = require('../utils/calculate');

// POST /api/ai/quantity-advice
// The backend calculates the real numbers first (deterministic, source of truth).
// If AI_API_KEY is configured, we ask the model to phrase a friendly explanation
// of those already-computed numbers. The AI is NEVER allowed to invent numbers.
// If no key is configured, we return a plain templated explanation instead —
// the calculator still fully works without AI.
async function quantityAdvice(req, res, next) {
  try {
    const { length, width, unit, blockLength, blockWidth, wastage, depth, productName } = req.body || {};

    const result = calculateQuantity({
      length: Number(length),
      width: Number(width),
      unit,
      blockLength: Number(blockLength),
      blockWidth: Number(blockWidth),
      wastage: wastage !== undefined ? Number(wastage) : 0,
      depth: depth !== undefined && depth !== '' ? Number(depth) : undefined
    });

    const fallbackMessage =
      `Based on the entered land dimensions (${result.landAreaSqFt} sq.ft) and the selected ` +
      `${productName || 'paver'} size, approximately ${result.basicBlocks} blocks are required. ` +
      `With ${result.wastagePercent}% wastage, the recommended quantity is ${result.recommendedBlocks} blocks.` +
      (result.estimatedBrass !== null
        ? ` For the base material at the specified depth, the estimated volume is approximately ${result.estimatedBrass} brass.`
        : '');

    if (!process.env.AI_API_KEY) {
      return res.json({ success: true, message: fallbackMessage, aiGenerated: false, calculation: result });
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.AI_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          system:
            'You are a helpful assistant for a paving-block factory. You are given ALREADY-COMPUTED, ' +
            'accurate numbers. Restate them clearly and helpfully for a customer in 2-4 short sentences. ' +
            'Do NOT invent, recalculate, or alter any numbers — use exactly the figures given to you.',
          messages: [
            {
              role: 'user',
              content:
                `Land area: ${result.landAreaSqFt} sq.ft. Product: ${productName || 'paver'}. ` +
                `Basic blocks needed: ${result.basicBlocks}. Wastage: ${result.wastagePercent}%. ` +
                `Recommended blocks (with wastage): ${result.recommendedBlocks}. ` +
                (result.estimatedBrass !== null ? `Estimated brass required: ${result.estimatedBrass}. ` : '') +
                `Write a short, friendly explanation of this estimate for the customer.`
            }
          ]
        })
      });

      if (!response.ok) throw new Error(`AI API responded with ${response.status}`);
      const data = await response.json();
      const text = (data.content || [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();

      res.json({ success: true, message: text || fallbackMessage, aiGenerated: !!text, calculation: result });
    } catch (aiErr) {
      console.error('[WARN] AI advice failed, using fallback:', aiErr.message);
      res.json({ success: true, message: fallbackMessage, aiGenerated: false, calculation: result });
    }
  } catch (err) {
    next(err);
  }
}

module.exports = { quantityAdvice };
