import sys
c = open(sys.argv[1], 'r', encoding='utf-8').read()
ins = '''function ToolBtn({ children, onClick, title = "", active = false }: { children: React.ReactNode; onClick: () => void; title?: string; active?: boolean }) {
  return (
    <button onClick={onClick} title={title}
      className={\u0060w-7 h-7 flex items-center justify-center rounded text-xs hover:bg-slate-100 transition-colors \u0024{active ? "bg-slate-200 text-blue-600" : "text-slate-500"}\u0060}>
      {children}
    </button>
  );
}

function ToolDivider() { return <div className="w-px h-5 bg-slate-200 shrink-0" />; }

'''
i = c.find('export default')
if i > 0 and 'function ToolBtn' not in c[:i]:
    c = c[:i] + ins + c[i:]
    print('Inserted')
else:
    print('Already there')
open(sys.argv[1], 'w', encoding='utf-8').write(c)
