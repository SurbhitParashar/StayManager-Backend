const express = require('express');
const auth = require('../middleware/authMiddleware');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.get('/reports/kpis', auth, reportController.kpis);
router.get('/reports/revenue', auth, reportController.revenue);
router.get('/reports/property-performance', auth, reportController.propertyPerformance);
router.get('/reports/source-breakdown', auth, reportController.sourceBreakdown);
router.get('/reports/payments', auth, reportController.payments);

module.exports = router;
