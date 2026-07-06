import sys
c = open(sys.argv[1], 'r', encoding='utf-8').read()
oldt = '''{!subSidebarOpen && (
        <button onClick={toggleSubSidebar} className="fixed top-16 z-30 w-8 h-8 flex items-center justify-center rounded hover:bg-slate-200 bg-white/80 shadow-sm text-slate-500" style={{ left: "0.75rem" }} title="\u5C55\u5F00\u76EE\u5F55">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      )}'''
c = c.replace(oldt, '{!subSidebarOpen && (<SubToggle />)}')
open(sys.argv[1], 'w', encoding='utf-8').write(c)
print('OK')