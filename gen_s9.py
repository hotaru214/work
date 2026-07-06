import sys
c = open(sys.argv[1], 'r', encoding='utf-8').read()
if 'SubToggle' not in c:
  sub = '''  function SubToggle() {
    const leftPos = mainSidebarOpen ? "calc(14rem + 4px)" : "4px";
    return (
      <button onClick={toggleSubSidebar}
        className="absolute z-30 top-14 w-6 h-8 flex items-center justify-center rounded-r hover:bg-slate-200 bg-white/90 shadow-sm text-slate-500 border border-slate-200"
        style={{ left: leftPos, transition: "left 0.2s" }}
        title={subSidebarOpen ? "\u6536\u8D77\u76EE\u5F55" : "\u5C55\u5F00\u76EE\u5F55"}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points={subSidebarOpen ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
        </svg>
      </button>
    );
  }

'''
  idx = c.find('  return (')
  if idx > 0:
    c = c[:idx] + sub + c[idx:]
open(sys.argv[1], 'w', encoding='utf-8').write(c)
print('OK')