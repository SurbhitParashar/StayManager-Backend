const { requirePermission } = require('../config/permissions');
const express = require('express');
const auth = require('../middleware/authMiddleware');
const guestController = require('../controllers/guestController');

const router = express.Router();

router.get('/guests', auth, requirePermission('data.read'), guestController.listGuests);
router.post('/guests', auth, requirePermission('data.write'), guestController.createGuest);
router.get('/guests/:id', auth, requirePermission('data.read'), guestController.getGuest);
router.put('/guests/:id', auth, requirePermission('data.write'), guestController.updateGuest);
router.delete('/guests/:id', auth, requirePermission('data.delete'), guestController.deleteGuest);

module.exports = router;
