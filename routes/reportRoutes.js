const { requirePermission } = require('../config/permissions');
const express = require('express');
const auth = require('../middleware/authMiddleware');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.get('/reports/kpis', auth, requirePermission('reports.read'), reportController.kpis);
router.get('/reports/revenue', auth, requirePermission('reports.read'), reportController.revenue);
router.get('/reports/property-performance', auth, requirePermission('reports.read'), reportController.propertyPerformance);
router.get('/reports/source-breakdown', auth, requirePermission('reports.read'), reportController.sourceBreakdown);
router.get('/reports/payments', auth, requirePermission('reports.read'), reportController.payments);

module.exports = router;
