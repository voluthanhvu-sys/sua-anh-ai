// Stop hook: if files changed but NOW.md / LOG.md were not updated, remind the AI once (handoff, AGENTS.md section 5).
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {}
if (input.stop_hook_active) process.exit(0); // already reminded once this turn

let changed;
try {
  changed = execSync('git status --porcelain', { encoding: 'utf8' }).split('\n').filter(Boolean).map((l) => l.slice(3).trim());
} catch { process.exit(0); } // not a git repo yet

if (!changed.length) process.exit(0);
const missing = ['NOW.md', 'LOG.md'].filter((f) => !changed.includes(f));
if (missing.length) {
  console.error(`Handoff not done: files changed but ${missing.join(' and ')} not updated. Follow AGENTS.md section 5 (check.mjs, NOW.md, LOG.md, BACKLOG.md).`);
  process.exit(2);
}
