const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { calculate } = require('../controllers/calculateController');
const { quantityAdvice } = require('../controllers/aiController');

const calcLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 60 });

router.post('/calculate-quantity', calcLimiter, calculate);
router.post('/ai/quantity-advice', calcLimiter, quantityAdvice);

module.exports = router;
