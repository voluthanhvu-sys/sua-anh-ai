// Make a private invite link: node scripts/invite.mjs "<name>" <cheapai-key>
// Give each person their OWN CheapAI sub-key with a spending limit; delete that key in CheapAI to cut them off.
// Links are recorded in LINKS.local.txt (gitignored — never commit keys).
import { appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const [name, key] = process.argv.slice(2);
if (!name || !key) { console.error('usage: node scripts/invite.mjs "<name>" <key>'); process.exit(1); }
const link = `https://voluthanhvu-sys.github.io/sua-anh-ai/#k=${encodeURIComponent(key)}`;
appendFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'LINKS.local.txt'), `${new Date().toISOString().slice(0, 16)} ${name} ${link}\n`);
console.log(link);
