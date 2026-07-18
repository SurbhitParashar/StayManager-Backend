const express = require('express');
const auth = require('../middleware/authMiddleware');
const workflowController = require('../controllers/workflowController');

const router = express.Router();

router.get('/property-events', auth, workflowController.listEvents);
router.post('/property-events', auth, workflowController.createEvent);
router.delete('/property-events/:id', auth, workflowController.deleteEvent);

router.put('/reservations/:id/agreement', auth, workflowController.updateAgreement);
router.put('/reservations/:id/review', auth, workflowController.updateReview);

router.get('/contacts', auth, workflowController.listContacts);
router.post('/contacts', auth, workflowController.createContact);
router.post('/properties/:propertyId/contacts', auth, workflowController.linkPropertyContact);

module.exports = router;
