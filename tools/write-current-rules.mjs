import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
// Regenerate docs/CURRENT_RULES.md from the TypeScript source, without a bundler.
registerHooks({
  resolve(specifier, context, next) {
    try { return next(specifier, context); }
    catch (error) { if (specifier.startsWith('.')) return next(`${specifier}.ts`, context); throw error; }
  },
  load(url, context, next) {
    if (!url.endsWith('.ts')) return next(url, context);
    return { format: 'module', shortCircuit: true, source: stripTypeScriptTypes(readFileSync(new URL(url), 'utf8'), { mode: 'transform', sourceUrl: url }) };
  },
});
const { currentRulesMarkdown } = await import('./current-rules.ts');
writeFileSync(new URL('../docs/CURRENT_RULES.md', import.meta.url), currentRulesMarkdown());
console.log('Wrote docs/CURRENT_RULES.md');
