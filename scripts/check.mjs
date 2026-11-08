// Process checks every AI runs before handoff: node scripts/check.mjs
// Add a check here whenever a mistake can be caught by a machine (AGENTS.md section 2).
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8').replace(/\r/g, ''); // CRLF-safe
const errors = [];

const required = ['AGENTS.md', 'NOW.md', 'BACKLOG.md', 'LOG.md', 'CODEMAP.md', 'VALIDATION.md', 'docs/knowledge.md'];
for (const f of required) if (!existsSync(join(root, f))) errors.push(`missing ${f}`);

if (!errors.length) {
  const nowLines = read('NOW.md').split('\n').length;
  if (nowLines > 40) errors.push(`NOW.md has ${nowLines} lines (cap 40) — move old items to LOG.md`);

  const agentsLines = read('AGENTS.md').split('\n').length;
  if (agentsLines > 150) errors.push(`AGENTS.md has ${agentsLines} lines (cap 150) — move detail to docs/`);

  // Pointer files must stay pointers (no copied rules).
  for (const f of ['CLAUDE.md', 'GEMINI.md', '.cursorrules', '.github/copilot-instructions.md']) {
    if (existsSync(join(root, f)) && read(f).split('\n').length > 10) errors.push(`${f} grew past 10 lines — keep it a pointer to AGENTS.md`);
  }

  // Every lesson / decision / backlog entry must carry an absolute date.
  const dated = /^- (\[[ x-]\] )?\d{4}-\d{2}-\d{2}/;
  for (const f of ['docs/knowledge.md', 'BACKLOG.md']) {
    read(f).split('\n').forEach((line, i) => {
      if (line.startsWith('- ') && !dated.test(line) && !/^- (Lessons|Decisions|Dropped)$/.test(line))
        errors.push(`${f}:${i + 1} entry without date: "${line.slice(0, 60)}"`);
    });
  }

  // Relative dates rot; write absolute ones.
  for (const f of ['NOW.md', 'BACKLOG.md', 'docs/knowledge.md']) {
    if (/\b(today|yesterday|tomorrow|hôm nay|hôm qua|ngày mai)\b/i.test(read(f))) errors.push(`${f} uses a relative date — write YYYY-MM-DD`);
  }
}

if (errors.length) {
  console.error('check FAILED:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log('check OK');
