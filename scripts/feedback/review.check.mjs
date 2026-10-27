import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { main, renderReport, summarize } from './review.mjs';

const event = (overrides = {}) => ({ schemaVersion: 1, app: 'mise', source: 'synthetic',
  sessionId: 'fixture', operation: 'recipe_import_text', outcome: 'success',
  timestamp: new Date().toISOString(), ...overrides });

test('review separates synthetic/runtime evidence and rejects private-shaped input', () => {
  const summary = summarize([
    event(), event({ source: 'runtime', outcome: 'failure', code: 'invalid_recipe', durationMs: 100 }),
    event({ sourceUrl: 'https://example.com/private' }),
  ].map(e => JSON.stringify(e)).join('\n'));
  assert.equal(summary.accepted, 2);
  assert.equal(summary.rejected, 1);
  assert.equal(summary.groups.length, 2);
  const report = renderReport(summary);
  assert.match(report, /Reproduction:/);
  assert.match(report, /Success metric:/);
  assert.match(report, /Verification:/);
  assert.doesNotMatch(report, /example.com/);
  assert.match(renderReport(summarize(JSON.stringify(event()))), /No change needed/);
});

test('the documented local CLI writes review and aggregate artifacts without a key', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mise-feedback-'));
  const input = join(directory, 'events.jsonl');
  const output = join(directory, 'report.md');
  try {
    await writeFile(input, JSON.stringify(event()));
    await main(['--input', input, '--output', output]);
    assert.match(await readFile(output, 'utf8'), /No change needed/);
    assert.equal(JSON.parse(await readFile(join(directory, 'report.json'), 'utf8')).accepted, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
