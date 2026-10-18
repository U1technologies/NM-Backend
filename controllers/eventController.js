const Event = require('../models/eventModel');
const { toSlug, uniqueSlug } = require('../utils/slugify');
const { parsePagination, buildPaginationMeta } = require('../utils/paginate');
const logActivity = require('../utils/activityLogger');

const EVENT_FIELDS = [
  'title', 'seoTitle', 'metaDescription', 'description', 'content', 'location', 'category',
  'geoRegion', 'startDate', 'endDate', 'href', 'image', 'imageAlt', 'region', 'gradient', 'featured', 'published',
];

const slugExists = (excludeId) => async (slug) => {
  const query = { slug };
  if (excludeId) query._id = { $ne: excludeId };
  return Event.exists(query);
};

// @desc Create a new event
const createEvent = async (req, res) => {
  try {
    const requiredFields = {
      title: req.body.title,
      description: req.body.description,
      location: req.body.location,
      category: req.body.category,
      geoRegion: req.body.geoRegion,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
    };
    for (const [key, value] of Object.entries(requiredFields)) {
      if (value === undefined || value === null || value === '') {
        return res.status(400).json({ success: false, message: `Field "${key}" is required and missing!` });
      }
    }

    const eventData = {};
    EVENT_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) eventData[field] = req.body[field];
    });
    if (req.currentUser) eventData.createdBy = req.currentUser._id;

    const baseSlug = toSlug(req.body.slug || req.body.title);
    eventData.slug = await uniqueSlug(baseSlug, slugExists());

    const event = await Event.create(eventData);
    logActivity({ req, action: 'event.created', targetType: 'Event', targetId: event._id, targetLabel: event.title });
    return res.status(201).json({ success: true, message: 'Event created successfully', data: event });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update an existing event
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    EVENT_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) event[field] = req.body[field];
    });

    if (req.body.slug) {
      const baseSlug = toSlug(req.body.slug);
      event.slug = await uniqueSlug(baseSlug, slugExists(event._id));
    }

    await event.save();
    logActivity({ req, action: 'event.updated', targetType: 'Event', targetId: event._id, targetLabel: event.title });
    return res.status(200).json({ success: true, message: 'Event updated successfully', data: event });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Delete an event
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    await event.deleteOne();
    logActivity({ req, action: 'event.deleted', targetType: 'Event', targetId: event._id, targetLabel: event.title });
    return res.status(200).json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc List events — filter (category, geoRegion, featured, upcoming-only), paginate.
// Public callers only ever see published events; the admin list passes published=all.
const getEvents = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { category, geoRegion, featured, upcoming, published, sort } = req.query;

    const filter = {};
    if (published !== 'all') filter.published = true;
    if (category) filter.category = category;
    if (geoRegion) filter.geoRegion = geoRegion;
    if (featured === 'true') filter.featured = true;
    if (upcoming === 'true') filter.endDate = { $gte: new Date() };

    const sortSpec = sort === 'oldest' ? { startDate: 1 } : { startDate: 1 };

    const [events, total] = await Promise.all([
      Event.find(filter).select('-content').sort(sortSpec).skip(skip).limit(limit),
      Event.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { events, pagination: buildPaginationMeta(page, limit, total) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get a single event by slug (public: published only, unless ?preview=true)
const getEventBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const event = await Event.findOne({ slug });
    if (!event || (!event.published && req.query.preview !== 'true')) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    return res.status(200).json({ success: true, data: { event } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get a single event by id (admin edit form)
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    return res.status(200).json({ success: true, data: event });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Upload an event hero image to Cloudinary and return its URL
const uploadEventImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }
    return res.status(201).json({ success: true, data: { url: req.file.path } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createEvent,
  updateEvent,
  deleteEvent,
  getEvents,
  getEventBySlug,
  getEventById,
  uploadEventImage,
};
