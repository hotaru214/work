import sys
c = open(sys.argv[1], 'r', encoding='utf-8').read()
c = c.replace('  function getWordCount() { return (editorRef.current?.innerText || "").replace(/\s/g, "").length; }\n', '')
if 'function SubToggle' not in c:
    sub = '\n  function SubToggle() {\n    const leftPos = mainSidebarOpen ? "calc(14rem + 4px)" : "4px";\n    return (\n      <button onClick={toggleSubSidebar}\n        className="absolute z-30 top-14 w-6 h-8 flex items-center justify-center rounded-r hover:bg-slate-200 bg-white/90 shadow-sm text-slate-500 border border-slate-200"\n        style={{ left: leftPos, transition: "left 0.2s" }}\n        title={subSidebarOpen ? "\u6536\u8d77\u76ee\u5f55" : "\u5c55\u5f00\u76ee\u5f55"}>\n        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">\n          <polyline points={subSidebarOpen ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />\n        </svg>\n      </button>\n    );\n  }\n\n'
    idx = c.find('  return (')
    if idx > 0:
        c = c[:idx] + sub + c[idx:]
open(sys.argv[1], 'w', encoding='utf-8').write(c)
print('Fixed')
