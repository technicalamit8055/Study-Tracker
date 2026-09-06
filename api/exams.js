const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const EXAMS_DIR = path.join(DATA_DIR, 'exams');
const CATALOG_FILE = path.join(DATA_DIR, 'exams-catalog.json');

// Roadmaps are static content, so cache them in the serverless
// container to avoid re-reading from disk on every warm invocation.
const cache = {
  catalog: null,
  exams: {}
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function getCatalog() {
  if (!cache.catalog) {
    cache.catalog = readJson(CATALOG_FILE);
  }
  return cache.catalog;
}

function getExam(examId) {
  if (cache.exams[examId]) return cache.exams[examId];

  const catalog = getCatalog();
  const entry = catalog.exams.find(e => e.id === examId);
  if (!entry || !entry.available) return null;

  // Resolve strictly against the catalog's registered filename so a
  // crafted examId can never escape the exams directory.
  const file = path.join(EXAMS_DIR, path.basename(entry.file));
  if (!fs.existsSync(file)) return null;

  const exam = readJson(file);
  cache.exams[examId] = exam;
  return exam;
}

/**
 * GET /api/exams              -> catalog of all exams grouped by category
 * GET /api/exams?examId=<id>  -> full roadmap for a single exam
 */
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const examId = (req.query && req.query.examId) || null;

    if (examId) {
      const exam = getExam(examId);
      if (!exam) {
        return res.status(404).json({ error: `Exam roadmap not found: ${examId}` });
      }
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      return res.status(200).json({ exam });
    }

    const catalog = getCatalog();
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      categories: catalog.categories,
      exams: catalog.exams,
      updated: catalog.updated
    });
  } catch (error) {
    console.error('Exams API error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};

module.exports.getExam = getExam;
module.exports.getCatalog = getCatalog;
