// SessionStart hook: give the AI its starting context cheaply (NOW.md + last LOG entry + open backlog).
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => (existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8') : '');

const log = read('LOG.md').split(/\n(?=## \d{4}-)/);
const open = read('BACKLOG.md').split('\n').filter((l) => l.startsWith('- [ ]'));

console.log('### NOW.md\n' + read('NOW.md').trim());
console.log('\n### Last LOG entry\n' + (log.length > 1 ? log.at(-1).trim() : '(none)'));
console.log(`\n### Open backlog (${open.length})\n` + (open.slice(-10).join('\n') || '(none)'));
console.log('\nRules: AGENTS.md (read it before working; grep the lookup files, never read them whole).');
