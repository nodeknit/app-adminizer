import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Give every relative specifier in `dist` the extension Node's ESM loader insists on.
 *
 * This package is `"type": "module"` but compiles with `moduleResolution: node`, so the sources
 * are written extensionless (`./WorkflowEngine`) and `tsc` emits them verbatim. Node's ESM
 * resolver has no such lookup: a relative specifier must name a file, and a directory has to be
 * spelled out as its `index.js`.
 *
 * Nothing noticed for a long time because the two consumers both forgive it — the app runs under
 * tsx, and a bundler resolves it — so the broken form only surfaces where the package is loaded
 * as plain ESM, which is what a test runner does with an externalised dependency. It surfaced as
 * `Cannot find module .../dist/src/index`, and only after a rebuild: until then a `node_modules`
 * copy from an older build carried the correct form and hid it.
 *
 * Run after `tsc`, never instead of it.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(here, '..', 'dist');

/**
 * Two patterns, and the difference between them is the whole reason this pass can fail the build.
 *
 * The rewriting one is lenient — `import ... 'x'`, `export ... from 'x'`, and the `import('x')`
 * tsc emits into `.d.ts` — because it only ever edits what it can resolve.
 *
 * The checking one is anchored to the start of a line, so only a real statement can make the build
 * fail. tsc copies comments through verbatim, and a commented-out import naming a file somebody
 * deleted years ago is not a broken build — `// import * as adminpanelConfig from "./adminizerConfig"`
 * in app-adminizer is exactly that, and a lenient check stops the build on it.
 */
const SPECIFIER = /(import\s[^'"]*?['"]|export\s[^'"]*?from\s+['"]|import\s*\(\s*['"])(\.[^'"]*)(['"])/g;
const STATEMENT = /^[ \t]*(?:import|export)\s+(?:[^'"]*?\bfrom\s*)?['"](\.[^'"]*)['"]/gm;
const EXPLICIT_EXTENSION = /\.(js|mjs|cjs|json|node)$/;

/** What Node needs in place of this specifier, or null when nothing on disk answers to it. */
function resolveSpecifier(fromDir, specifier) {
  if (EXPLICIT_EXTENSION.test(specifier)) return null;
  const target = path.resolve(fromDir, specifier);
  if (fs.existsSync(`${target}.js`)) return `${specifier}.js`;
  // A directory import: legal for the old resolver, never for ESM.
  if (fs.existsSync(path.join(target, 'index.js'))) return `${specifier.replace(/\/+$/, '')}/index.js`;
  return null;
}

let rewritten = 0;
const unresolved = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.lstatSync(full).isDirectory()) {
      walk(full);
    } else if (entry.endsWith('.js') || entry.endsWith('.d.ts')) {
      const before = fs.readFileSync(full, 'utf8');
      const fromDir = path.dirname(full);
      const after = before.replace(SPECIFIER, (match, prefix, specifier, quote) => {
        if (EXPLICIT_EXTENSION.test(specifier)) return match;
        const resolved = resolveSpecifier(fromDir, specifier);
        if (!resolved) return match;
        rewritten += 1;
        return prefix + resolved + quote;
      });
      if (after !== before) fs.writeFileSync(full, after);

      // Checked against the rewritten text and only on real statements: anything still
      // extensionless here is an import Node will fail on at runtime.
      for (const [, specifier] of after.matchAll(STATEMENT)) {
        if (!EXPLICIT_EXTENSION.test(specifier)) {
          unresolved.push(`${path.relative(DIST, full)}: ${specifier}`);
        }
      }
    }
  }
}

if (!fs.existsSync(DIST)) {
  console.error('appendJsExtension: dist/ is missing — run `tsc` first.');
  process.exit(1);
}

walk(DIST);

// A specifier nothing on disk answers to is a broken import that would only be discovered at
// runtime, so it fails the build rather than shipping.
if (unresolved.length) {
  console.error(`appendJsExtension: ${unresolved.length} specifier(s) resolve to nothing:`);
  for (const line of unresolved) console.error(`  ${line}`);
  process.exit(1);
}

console.log(`appendJsExtension: rewrote ${rewritten} specifier(s) in dist/`);
