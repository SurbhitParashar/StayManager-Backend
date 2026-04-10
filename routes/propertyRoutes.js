const express=require('express');
const router=express.Router();
const { getProperties } =require('../controllers/propertyController');
const auth=require('../middleware/authMiddleware');

router.get('/properties',auth ,getProperties);

module.exports=router;