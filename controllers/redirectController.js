const { Parser: CsvParser } = require('json2csv');
const BlogRedirect = require('../models/blogRedirectModel');
const NotFoundLog = require('../models/notFoundLogModel');
const { parsePagination, buildPaginationMeta } = require('../utils/paginate');
const logActivity = require('../utils/activityLogger');

const normalizePath = (path) => {
  let p = (path || '').trim();
  if (!p.startsWith('/')) p = `/${p}`;
  return p.replace(/\/+$/, '') || '/';
};

// @desc List redirects (admin)
const getRedirects = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.q?.trim()) {
      const regex = new RegExp(req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ fromPath: regex }, { toPath: regex }];
    }

    const [redirects, total] = await Promise.all([
      BlogRedirect.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      BlogRedirect.countDocuments(filter),
    ]);

    return res.status(200).json({ success: true, data: { redirects, pagination: buildPaginationMeta(page, limit, total) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Public: every active redirect — fetched (and cached) by the frontend's middleware
const getActiveRedirects = async (req, res) => {
  try {
    const redirects = await BlogRedirect.find({ isActive: true }).select('fromPath toPath type').lean();
    return res.status(200).json({ success: true, data: redirects });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Fire-and-forget hit counter, called by the frontend middleware when a redirect fires
const recordRedirectHit = async (req, res) => {
  try {
    const fromPath = normalizePath(req.body.fromPath);
    await BlogRedirect.updateOne({ fromPath }, { $inc: { hitCount: 1 } });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Create a redirect
const createRedirect = async (req, res) => {
  try {
    const fromPath = normalizePath(req.body.fromPath);
    const toPath = normalizePath(req.body.toPath);
    if (!req.body.fromPath || !req.body.toPath) {
      return res.status(400).json({ success: false, message: 'fromPath and toPath are required' });
    }
    if (fromPath === toPath) {
      return res.status(400).json({ success: false, message: 'fromPath and toPath cannot be the same' });
    }

    const redirect = await BlogRedirect.create({
      fromPath,
      toPath,
      type: [301, 302].includes(Number(req.body.type)) ? Number(req.body.type) : 301,
    });
    logActivity({ req, action: 'redirect.created', targetType: 'BlogRedirect', targetId: redirect._id, targetLabel: `${fromPath} -> ${toPath}` });
    return res.status(201).json({ success: true, message: 'Redirect created', data: redirect });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A redirect from that path already exists' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update a redirect
const updateRedirect = async (req, res) => {
  try {
    const { id } = req.params;
    const redirect = await BlogRedirect.findById(id);
    if (!redirect) {
      return res.status(404).json({ success: false, message: 'Redirect not found' });
    }

    if (req.body.fromPath !== undefined) redirect.fromPath = normalizePath(req.body.fromPath);
    if (req.body.toPath !== undefined) redirect.toPath = normalizePath(req.body.toPath);
    if (req.body.type !== undefined && [301, 302].includes(Number(req.body.type))) redirect.type = Number(req.body.type);
    if (req.body.isActive !== undefined) redirect.isActive = req.body.isActive;

    await redirect.save();
    logActivity({ req, action: 'redirect.updated', targetType: 'BlogRedirect', targetId: redirect._id, targetLabel: `${redirect.fromPath} -> ${redirect.toPath}` });
    return res.status(200).json({ success: true, message: 'Redirect updated', data: redirect });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A redirect from that path already exists' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Delete a redirect
const deleteRedirect = async (req, res) => {
  try {
    const { id } = req.params;
    const redirect = await BlogRedirect.findById(id);
    if (!redirect) {
      return res.status(404).json({ success: false, message: 'Redirect not found' });
    }
    await redirect.deleteOne();
    logActivity({ req, action: 'redirect.deleted', targetType: 'BlogRedirect', targetId: redirect._id, targetLabel: `${redirect.fromPath} -> ${redirect.toPath}` });
    return res.status(200).json({ success: true, message: 'Redirect deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Export all redirects as CSV
const exportRedirects = async (req, res) => {
  try {
    const redirects = await BlogRedirect.find().sort({ fromPath: 1 }).lean();
    const parser = new CsvParser({ fields: ['fromPath', 'toPath', 'type', 'isActive', 'hitCount'] });
    const csv = parser.parse(redirects);
    res.header('Content-Type', 'text/csv');
    res.attachment(`redirects-${new Date().toISOString().split('T')[0]}.csv`);
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const parseCsvLine = (line) => {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else current += char;
  }
  fields.push(current.trim());
  return fields;
};

// @desc Import redirects from an uploaded CSV (columns: fromPath, toPath, type)
const importRedirects = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'A CSV file is required' });
    }
    const lines = req.file.buffer.toString('utf-8').trim().split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      return res.status(400).json({ success: false, message: 'CSV file has no data rows' });
    }
    const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const fromIdx = header.indexOf('frompath');
    const toIdx = header.indexOf('topath');
    const typeIdx = header.indexOf('type');
    if (fromIdx === -1 || toIdx === -1) {
      return res.status(400).json({ success: false, message: 'CSV must have fromPath and toPath columns' });
    }

    let created = 0;
    let skipped = 0;
    for (const line of lines.slice(1)) {
      const fields = parseCsvLine(line);
      const fromPath = normalizePath(fields[fromIdx]);
      const toPath = normalizePath(fields[toIdx]);
      if (!fromPath || !toPath || fromPath === toPath) {
        skipped += 1;
        continue;
      }
      const type = typeIdx !== -1 && Number(fields[typeIdx]) === 302 ? 302 : 301;
      const existing = await BlogRedirect.findOne({ fromPath });
      if (existing) {
        skipped += 1;
        continue;
      }
      await BlogRedirect.create({ fromPath, toPath, type });
      created += 1;
    }

    logActivity({ req, action: 'redirects_imported', metadata: { created, skipped } });
    return res.status(200).json({ success: true, message: `Imported ${created} redirect(s), skipped ${skipped}`, data: { created, skipped } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Public: log a 404 hit (called from the custom 404 page)
const logNotFound = async (req, res) => {
  try {
    const path = normalizePath(req.body.path);
    if (!path) {
      return res.status(400).json({ success: false, message: 'path is required' });
    }
    await NotFoundLog.findOneAndUpdate(
      { path },
      { $inc: { count: 1 }, $set: { lastSeenAt: new Date(), referrer: req.body.referrer || '' } },
      { upsert: true }
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc List 404 logs, most frequent first
const getNotFoundLogs = async (req, res) => {
  try {
    const logs = await NotFoundLog.find().sort({ count: -1 }).limit(100);
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getRedirects,
  getActiveRedirects,
  recordRedirectHit,
  createRedirect,
  updateRedirect,
  deleteRedirect,
  exportRedirects,
  importRedirects,
  logNotFound,
  getNotFoundLogs,
};
