const guestRepository = require('../repositories/guestRepository');
const guestSchema = require('../validations/guestSchema');

const parseValidationError = (err) => err.errors || err.issues;

exports.listGuests = async (req, res) => {
  try {
    const guests = await guestRepository.listGuests({
      search: req.query.search || '',
      limit: Math.min(Number(req.query.limit) || 25, 100),
      offset: Number(req.query.offset) || 0,
    });

    res.json(guests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load guests' });
  }
};

exports.getGuest = async (req, res) => {
  try {
    const guest = await guestRepository.getGuestById(req.params.id);

    if (!guest) {
      return res.status(404).json({ message: 'Guest not found' });
    }

    res.json(guest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load guest' });
  }
};

exports.createGuest = async (req, res) => {
  try {
    const data = guestSchema.parse(req.body);
    const guest = await guestRepository.createGuest(null, data);
    res.status(201).json(guest);
  } catch (err) {
    const validationErrors = parseValidationError(err);
    if (validationErrors) {
      return res.status(400).json({ error: validationErrors[0].message });
    }

    console.error(err);
    res.status(500).json({ message: 'Failed to create guest' });
  }
};

exports.updateGuest = async (req, res) => {
  try {
    const data = guestSchema.parse(req.body);
    const guest = await guestRepository.updateGuest(req.params.id, data);

    if (!guest) {
      return res.status(404).json({ message: 'Guest not found' });
    }

    res.json(guest);
  } catch (err) {
    const validationErrors = parseValidationError(err);
    if (validationErrors) {
      return res.status(400).json({ error: validationErrors[0].message });
    }

    console.error(err);
    res.status(500).json({ message: 'Failed to update guest' });
  }
};

exports.deleteGuest = async (req, res) => {
  try {
    const deleted = await guestRepository.softDeleteGuest(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Guest not found' });
    }

    res.json({ message: 'Guest deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete guest' });
  }
};
