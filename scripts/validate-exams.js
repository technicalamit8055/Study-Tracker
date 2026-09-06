const fs = require('fs');
const path = require('path');

const catalog = JSON.parse(fs.readFileSync('data/exams-catalog.json', 'utf8'));
let errors = [];
const seenTopicIds = new Set();

const catIds = new Set(catalog.categories.map(c => c.id));
catalog.exams.forEach(e => {
  if (!catIds.has(e.categoryId)) errors.push(`${e.id}: unknown categoryId ${e.categoryId}`);
});

for (const entry of catalog.exams.filter(e => e.available)) {
  const p = path.join('data/exams', entry.file);
  if (!fs.existsSync(p)) { errors.push(`missing file ${p}`); continue; }
  const ex = JSON.parse(fs.readFileSync(p, 'utf8'));

  if (ex.id !== entry.id) errors.push(`${entry.id}: id mismatch (${ex.id})`);
  if (ex.totalMarks !== entry.totalMarks) errors.push(`${entry.id}: totalMarks mismatch`);
  ['title', 'category', 'totalMarks', 'passingMarks', 'phases', 'sections', 'resourcePrefix'].forEach(k => {
    if (ex[k] === undefined) errors.push(`${entry.id}: missing field ${k}`);
  });

  const sectionIds = new Set(ex.sections.map(s => s.id));
  let sectionMarksSum = 0;
  ex.sections.forEach(s => {
    sectionMarksSum += s.marks;
    ['id', 'name', 'marks', 'badgeColor'].forEach(k => {
      if (s[k] === undefined) errors.push(`${entry.id}/${s.id}: section missing ${k}`);
    });
  });
  if (sectionMarksSum !== ex.totalMarks) {
    errors.push(`${entry.id}: section marks sum ${sectionMarksSum} != totalMarks ${ex.totalMarks}`);
  }

  if (ex.phases.length !== 3) errors.push(`${entry.id}: expected 3 phases, got ${ex.phases.length}`);

  const unitIds = new Set();
  let topics = 0, units = 0;
  ex.phases.forEach(ph => {
    ['id', 'name', 'description', 'units'].forEach(k => {
      if (ph[k] === undefined) errors.push(`${entry.id}/${ph.id}: phase missing ${k}`);
    });
    ph.units.forEach(u => {
      units++;
      ['id', 'unitNum', 'title', 'priority', 'priorityLabel', 'estMarks', 'sectionId', 'sectionName', 'sectionMarks', 'topics'].forEach(k => {
        if (u[k] === undefined) errors.push(`${entry.id}/${u.id}: unit missing ${k}`);
      });
      if (!['high', 'medium', 'standard'].includes(u.priority)) errors.push(`${entry.id}/${u.id}: bad priority ${u.priority}`);
      if (!sectionIds.has(u.sectionId)) errors.push(`${entry.id}/${u.id}: unknown sectionId ${u.sectionId}`);
      if (unitIds.has(u.id)) errors.push(`${entry.id}: duplicate unit id ${u.id}`);
      unitIds.add(u.id);
      if (!u.topics.length) errors.push(`${entry.id}/${u.id}: no topics`);
      u.topics.forEach((t, i) => {
        topics++;
        if (t.id !== `${u.id}_t${i}`) errors.push(`${entry.id}/${u.id}: topic id ${t.id} != ${u.id}_t${i}`);
        if (!t.text || !t.text.trim()) errors.push(`${entry.id}/${t.id}: empty text`);
        const g = `${ex.id}::${t.id}`;
        if (seenTopicIds.has(g)) errors.push(`duplicate global topic ${g}`);
        seenTopicIds.add(g);
      });
    });
  });
  console.log(`✓ ${entry.id.padEnd(24)} ${String(units).padStart(3)} units  ${String(topics).padStart(4)} topics  ${ex.totalMarks} marks  (${ex.sections.length} sections)`);
}

if (errors.length) {
  console.log('\n✗ VALIDATION ERRORS:');
  errors.forEach(e => console.log('  - ' + e));
  process.exit(1);
}
console.log('\nAll exam schemas valid.');
