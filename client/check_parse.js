const ts = require('typescript');
const fs = require('fs');
const src = fs.readFileSync('src/pages/kb/KBDetail.tsx', 'utf8');
const sf = ts.createSourceFile('test.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
for (const d of sf.parseDiagnostics) {
  const pos = sf.getLineAndCharacterOfPosition(d.start);
  console.log('Line', pos.line+1, 'Col', pos.character+1, '-', ts.flattenDiagnosticMessageText(d.messageText, '\n'));
}
if (sf.parseDiagnostics.length === 0) console.log('No parse errors');
