import sys
c = open(sys.argv[1], 'r', encoding='utf-8').read()
old = 'function execCommand(cmd: string, value?: string) {\n    document.execCommand(cmd, false, value);\n    if (editorRef.current) editorRef.current.focus();\n  }'
newf = '''
  function execCmd(cmd, value) {
    document.execCommand(cmd, false, value);
    if (editorRef.current) editorRef.current.focus();
    scheduleSave();
  }

  function handleHeading(tag) {
    document.execCommand('formatBlock', false, '<' + tag + '>');
    setShowHeading(false);
    if (editorRef.current) editorRef.current.focus();
  }

  function handleFontSize(size) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const span = document.createElement('span');
      span.style.fontSize = size + 'px';
      try { sel.getRangeAt(0).surroundContents(span); } catch {}
    }
    setShowFontSize(false);
    if (editorRef.current) editorRef.current.focus();
  }

  function handleColor(color) {
    document.execCommand('styleWithCSS', false, 'true');
    execCmd('foreColor', color);
    setShowColor(false);
  }

  function handleBgColor(color) {
    document.execCommand('styleWithCSS', false, 'true');
    execCmd('hiliteColor', color);
    setShowBgColor(false);
  }

  function handleImage() {
    const url = prompt('\u8bf7\u8f93\u5165\u56fe\u7247\u5730\u5740');
    if (url) execCmd('insertImage', url);
  }

  function createTable() {
    const rows = prompt('\u884c\u6570', '3');
    const cols = prompt('\u5217\u6570', '3');
    if (rows && cols) {
      let html = '<table border="1" style="border-collapse:collapse;width:100%;margin:0.5em 0">';
      for (let r = 0; r < parseInt(rows); r++) {
        html += '<tr>';
        for (let c = 0; c < parseInt(cols); c++) {
          html += '<td style="padding:6px;border:1px solid #ccc">&nbsp;</td>';
        }
        html += '</tr>';
      }
      html += '</table>';
      document.execCommand('insertHTML', false, html);
      if (editorRef.current) editorRef.current.focus();
    }
  }
  function getWordCount() {
    return (editorRef.current?.innerText || '').replace(/\\s/g, '').length;
  }
'''
if old in c:
    c = c.replace(old, newf)
    print('Replaced execCommand with full set')
else:
    print('Pattern NOT found')
open(sys.argv[1], 'w', encoding='utf-8').write(c)
