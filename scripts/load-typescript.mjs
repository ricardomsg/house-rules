// Small test loader for the project's TypeScript modules; uses the installed compiler.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);

const root = fileURLToPath(new URL('../', import.meta.url));
const modules = new Map();
function moduleUrl(filename) {
  if (!path.extname(filename)) filename = ['.ts', '.tsx', '.json', '/index.ts'].map((extension) => filename + extension).find((candidate) => fs.existsSync(candidate));
  if (modules.has(filename)) return modules.get(filename);
  let source = fs.readFileSync(filename, 'utf8');
  if (filename.endsWith('.json')) source = `export default ${source};`;
  else source = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  source = source.replace(/from\s+["']([^"']+)["']/g, (_, specifier) => {
    const resolved = specifier.startsWith('.') ? moduleUrl(path.resolve(path.dirname(filename), specifier))
      : specifier.startsWith('@/') ? moduleUrl(path.resolve(root, specifier.slice(2))) : specifier.startsWith('node:') ? specifier : pathToFileURL(require.resolve(specifier)).href;
    return `from ${JSON.stringify(resolved)}`;
  });
  const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  modules.set(filename, url);
  return url;
}
export function importTypeScript(filename) { return import(moduleUrl(path.resolve(root, filename))); }
