const { requirePermission } = require('../config/permissions');
const express=require('express');

const router=express.Router();
const auth=require('../middleware/authMiddleware');
const {createBooking, 
    getAllBookings, 
    deleteBooking, 
    updateBooking,
    getBookingById}=require('../controllers/bookingController')

router.post('/booking', auth, requirePermission('data.write'),createBooking)
router.get('/booking', auth, requirePermission('data.read'),getAllBookings)
router.delete('/booking/:id', auth, requirePermission('data.delete'),deleteBooking)
router.put('/booking/:id', auth, requirePermission('data.write'),updateBooking)
router.get('/booking/:id', auth, requirePermission('data.read'),getBookingById)


module.exports=router;