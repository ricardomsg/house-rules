import fs from 'node:fs';
import ts from 'typescript';
import * as content from '../lib/game-content.ts';
import { games } from '../lib/games.ts';
import { gameGuides } from '../lib/game-guides.ts';

const values = new Set();

function collect(value) {
  if (typeof value === 'string') {
    if (/[A-Za-z]/.test(value)) values.add(value.trim());
    return;
  }
  if (Array.isArray(value)) return value.forEach(collect);
  if (value && typeof value === 'object') Object.values(value).forEach(collect);
}

collect(content);
collect(games);
collect(gameGuides);

for (const file of ['app/page.tsx', 'app/games/page.tsx', 'app/room/[code]/page.tsx', 'app/room/[code]/GameBoard.tsx', 'app/api/rooms/[code]/game/route.ts']) {
  const source = fs.readFileSync(file, 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/g, ' ').trim();
      if (/[A-Za-z]/.test(text)) values.add(text);
    } else if (ts.isStringLiteral(node) && /[A-Za-z]/.test(node.text) && node.text.includes(' ')) {
      values.add(node.text.trim());
    } else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      const text = node.text.replace(/\s+/g, ' ').trim();
      if (/[A-Za-z]/.test(text)) values.add(text);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
}

process.stdout.write(JSON.stringify([...values].sort((a, b) => a.localeCompare(b)), null, 2));
