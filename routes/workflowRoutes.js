const { requirePermission } = require('../config/permissions');
const express = require('express');
const auth = require('../middleware/authMiddleware');
const workflowController = require('../controllers/workflowController');

const router = express.Router();

router.get('/property-events', auth, requirePermission('data.read'), workflowController.listEvents);
router.post('/property-events', auth, requirePermission('data.write'), workflowController.createEvent);
router.delete('/property-events/:id', auth, requirePermission('data.delete'), workflowController.deleteEvent);

router.put('/reservations/:id/agreement', auth, requirePermission('data.write'), workflowController.updateAgreement);
router.put('/reservations/:id/review', auth, requirePermission('data.write'), workflowController.updateReview);

router.get('/contacts', auth, requirePermission('data.read'), workflowController.listContacts);
router.post('/contacts', auth, requirePermission('data.write'), workflowController.createContact);
router.post('/properties/:propertyId/contacts', auth, requirePermission('data.write'), workflowController.linkPropertyContact);

module.exports = router;
