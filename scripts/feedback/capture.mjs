import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

mkdirSync('.feedback', { recursive: true });
const output = resolve('.feedback/events.jsonl');
writeFileSync(output, '');
const run = spawnSync('npx', ['playwright', 'test', 'e2e/feedback.e2e.ts', 'e2e/diagnostics-settings.e2e.ts'], {
  stdio: 'inherit', env: { ...process.env, FEEDBACK_OUTPUT: output },
});
if (run.error) console.error(run.error.message);
process.exitCode = run.status ?? 1;
