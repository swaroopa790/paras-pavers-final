const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const ctrl = require('../controllers/adminController');

router.use(adminAuth); // every route below requires a valid admin token

router.get('/products', ctrl.listAllProducts);
router.post('/products', ctrl.createProduct);
router.put('/products/:id', ctrl.updateProduct);
router.patch('/products/:id/status', ctrl.setActiveStatus);
router.get('/reviews', ctrl.listAllReviews);
router.get('/calculations', ctrl.listCalculations);

module.exports = router;
