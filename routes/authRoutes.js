const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const { login, me, logout } = require('../controllers/authController');
router.post('/login', require('../middleware/loginLimiter'), login);
router.get('/me', auth, me);
router.post('/logout', auth, logout);
module.exports = router;
