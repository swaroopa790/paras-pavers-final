const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const ctrl = require('../controllers/productController');

// Limit review submissions to prevent spam/abuse
const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, error: 'Too many reviews submitted. Please try again later.' }
});

router.get('/', ctrl.getProducts);
router.get('/:id', ctrl.getProductById);
router.get('/:id/reviews', ctrl.getReviews);
router.get('/:id/rating', ctrl.getRatingSummary);
router.post('/:id/reviews', reviewLimiter, ctrl.postReview);

module.exports = router;
