const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const { requirePermission } = require('../config/permissions');
const users = require('../controllers/userController');
router.use(auth, requirePermission('users.manage'));
router.get('/', users.list);
router.post('/', users.create);
router.patch('/:id/access', users.updateAccess);
module.exports = router;
