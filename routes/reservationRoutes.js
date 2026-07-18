const express = require('express');
const auth = require('../middleware/authMiddleware');
const reservationController = require('../controllers/reservationController');

const router = express.Router();

router.get('/reservations', auth, reservationController.listReservations);
router.post('/reservations', auth, reservationController.createReservation);
router.get('/reservations/:id', auth, reservationController.getReservation);
router.put('/reservations/:id', auth, reservationController.updateReservation);
router.delete('/reservations/:id', auth, reservationController.deleteReservation);
router.put('/reservations/:id/financials', auth, reservationController.updateFinancials);
router.put('/reservations/:id/payments', auth, reservationController.replacePayments);

module.exports = router;
