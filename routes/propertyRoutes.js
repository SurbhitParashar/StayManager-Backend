const express=require('express');
const router=express.Router();
const { getProperties } =require('../controllers/propertyController');
const auth=require('../middleware/authMiddleware');

router.get('/' ,getProperties);

module.exports=router;