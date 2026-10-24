import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { currentRulesMarkdown } from '../../tools/current-rules';

test('docs/CURRENT_RULES.md matches the source (run pnpm docs:rules after tuning changes)', () => {
  const committed = readFileSync(new URL('../../docs/CURRENT_RULES.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  expect(committed).toBe(currentRulesMarkdown());
});
