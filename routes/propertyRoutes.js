const { requirePermission } = require('../config/permissions');
const express=require('express');
const router=express.Router();
const { getProperties } =require('../controllers/propertyController');
const auth=require('../middleware/authMiddleware');

router.get('/' , auth, requirePermission('data.read'),getProperties);

module.exports=router;
