const express=require('express');

const router=express.Router();
const auth=require('../middleware/authMiddleware');
const {createBooking, 
    getAllBookings, 
    deleteBooking, 
    updateBooking,
    getBookingById}=require('../controllers/bookingController')

router.post('/booking',auth,createBooking)
router.get('/booking',auth,getAllBookings)
router.delete('/booking/:id',auth,deleteBooking)
router.put('/booking/:id',auth,updateBooking)
router.get('/booking/:id',auth,getBookingById)


module.exports=router;