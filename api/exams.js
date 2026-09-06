const fs = require('fs');
const path = require('path');

const ROOT_DATA_DIR = path.join(__dirname, '..', 'data');
const PUBLIC_DATA_DIR = path.join(__dirname, '..', 'public', 'data');

const cache = {
  catalog: null,
  exams: {}
};

function resolveDataPath(relPath) {
  const pRoot = path.join(ROOT_DATA_DIR, relPath);
  const pPublic = path.join(PUBLIC_DATA_DIR, relPath);

  const existRoot = fs.existsSync(pRoot);
  const existPublic = fs.existsSync(pPublic);

  if (existRoot && existPublic) {
    const mRoot = fs.statSync(pRoot).mtimeMs;
    const mPublic = fs.statSync(pPublic).mtimeMs;
    return mPublic > mRoot ? pPublic : pRoot;
  }
  if (existRoot) return pRoot;
  if (existPublic) return pPublic;
  return null;
}

function readJsonWithStat(relPath) {
  const file = resolveDataPath(relPath);
  if (!file) return null;
  const stat = fs.statSync(file);
  const content = fs.readFileSync(file, 'utf8');
  return {
    data: JSON.parse(content),
    mtimeMs: stat.mtimeMs,
    etag: `W/"${stat.size}-${Math.floor(stat.mtimeMs)}"`
  };
}

function getCatalog() {
  const file = resolveDataPath('exams-catalog.json');
  if (!file) return null;
  const stat = fs.statSync(file);

  if (cache.catalog && cache.catalog.mtimeMs >= stat.mtimeMs) {
    return cache.catalog;
  }

  const res = readJsonWithStat('exams-catalog.json');
  if (res) cache.catalog = res;
  return res;
}

function getExam(examId) {
  const catRes = getCatalog();
  const catalog = catRes ? catRes.data : null;
  if (!catalog || !catalog.exams) return null;

  const entry = catalog.exams.find(e => e.id === examId);
  if (!entry || !entry.available) return null;

  const relFile = path.join('exams', path.basename(entry.file));
  const absFile = resolveDataPath(relFile);
  if (!absFile) return null;

  const stat = fs.statSync(absFile);
  if (cache.exams[examId] && cache.exams[examId].mtimeMs >= stat.mtimeMs) {
    return cache.exams[examId];
  }

  const res = readJsonWithStat(relFile);
  if (res) cache.exams[examId] = res;
  return res;
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
      const examRes = getExam(examId);
      if (!examRes) {
        return res.status(404).json({ error: `Exam roadmap not found: ${examId}` });
      }

      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      res.setHeader('ETag', examRes.etag);

      if (req.headers['if-none-match'] === examRes.etag) {
        return res.status(304).end();
      }

      return res.status(200).json({ exam: examRes.data });
    }

    const catRes = getCatalog();
    if (!catRes) {
      return res.status(500).json({ error: 'Catalog data unavailable' });
    }

    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.setHeader('ETag', catRes.etag);

    if (req.headers['if-none-match'] === catRes.etag) {
      return res.status(304).end();
    }

    return res.status(200).json({
      categories: catRes.data.categories,
      exams: catRes.data.exams,
      updated: catRes.data.updated
    });
  } catch (error) {
    console.error('Exams API error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};

module.exports.getExam = function(id) {
  const r = getExam(id);
  return r ? r.data : null;
};
module.exports.getCatalog = function() {
  const r = getCatalog();
  return r ? r.data : null;
};

