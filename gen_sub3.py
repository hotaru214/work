import sys
c = open(sys.argv[1], 'r', encoding='utf-8').read()
rm_start = c.find('    function SubToggle()')
if rm_start > 0:
    rm_end = c.find('  }

', rm_start)
    if rm_end > 0:
        c = c[:rm_start] + c[rm_end+2:]
        print('Removed misplaced SubToggle')
idx = c.find('  return (\n    <div')
if idx > 0:
    bol = c.rfind('\n', 0, idx) + 1
    sub = '  function SubToggle() {\n    const leftPos = mainSidebarOpen ? "calc(14rem + 4px)" : "4px";\n    return (\n      <button onClick={toggleSubSidebar}\n        className="absolute z-30 top-14 w-6 h-8 flex items-center justify-center rounded-r hover:bg-slate-200 bg-white/90 shadow-sm text-slate-500 border border-slate-200"\n        style={{ left: leftPos, transition: \"left 0.2s\" }}\n        title={subSidebarOpen ? \"收起目录\" : \"展开目录\"}>\n        <svg width=\"10\" height=\"10\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2\">\n          <polyline points={subSidebarOpen ? \"15 18 9 12 15 6\" : \"9 18 15 12 9 6\"} />\n        </svg>\n      </button>\n    );\n  }\n\n'
    if 'function SubToggle' not in c:
        c = c[:bol] + sub + c[bol:]
        print('Added SubToggle at correct location')
    else:
        print('SubToggle still exists after removal - check logic')
else:
    print('Component return not found')
open(sys.argv[1], 'w', encoding='utf-8').write(c)
