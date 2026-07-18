const express = require('express');
const auth = require('../middleware/authMiddleware');
const guestController = require('../controllers/guestController');

const router = express.Router();

router.get('/guests', auth, guestController.listGuests);
router.post('/guests', auth, guestController.createGuest);
router.get('/guests/:id', auth, guestController.getGuest);
router.put('/guests/:id', auth, guestController.updateGuest);
router.delete('/guests/:id', auth, guestController.deleteGuest);

module.exports = router;
