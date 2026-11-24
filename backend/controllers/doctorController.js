const { DoctorProfile, Specialisation } = require('../models');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function searchDoctors(req, res) {
  const { specialisation, city } = req.query;

  if (
    (specialisation !== undefined && typeof specialisation !== 'string') ||
    (city !== undefined && typeof city !== 'string')
  ) {
    return res.status(400).json({
      success: false,
      message: 'Specialisation and city filters must be strings.',
    });
  }

  // Allow both 'verified' and newly registered 'pending' doctors to appear in search
  // (only excluding explicitly 'rejected' profiles or doctors who paused bookings)
  const filter = {
    verificationStatus: { $ne: 'rejected' },
    isAcceptingBookings: { $ne: false },
  };

  if (city?.trim()) {
    filter.city = { $regex: escapeRegex(city.trim()), $options: 'i' };
  }

  if (specialisation?.trim()) {
    const specialisationRecord = await Specialisation.findOne({
      name: { $regex: escapeRegex(specialisation.trim()), $options: 'i' },
      isActive: true,
    });

    if (!specialisationRecord) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    filter.specialisations = specialisationRecord._id;
  }

  const results = await DoctorProfile.find(filter)
    .populate({
      path: 'userId',
      select: 'name email',
      match: { isActive: { $ne: false } },
    })
    .populate('specialisations', 'name');

  const doctors = results.filter((doctor) => doctor.userId);

  return res.json({ success: true, count: doctors.length, data: doctors });
}

module.exports = { searchDoctors };