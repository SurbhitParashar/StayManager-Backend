const { requirePermission } = require('../config/permissions');
const express = require('express');
const auth = require('../middleware/authMiddleware');
const reservationController = require('../controllers/reservationController');

const router = express.Router();

router.get('/reservations', auth, requirePermission('data.read'), reservationController.listReservations);
router.post('/reservations', auth, requirePermission('data.write'), reservationController.createReservation);
router.get('/reservations/:id', auth, requirePermission('data.read'), reservationController.getReservation);
router.put('/reservations/:id', auth, requirePermission('data.write'), reservationController.updateReservation);
router.delete('/reservations/:id', auth, requirePermission('data.delete'), reservationController.deleteReservation);
router.put('/reservations/:id/financials', auth, requirePermission('data.write'), reservationController.updateFinancials);
router.put('/reservations/:id/payments', auth, requirePermission('data.write'), reservationController.replacePayments);

module.exports = router;
