import sys
c = open(sys.argv[1], 'r', encoding='utf-8').read()
if 'function TreeNode' not in c:
  ins = '''function ToolBtn({ children, onClick, title = "", active = false }: { children: React.ReactNode; onClick: () => void; title?: string; active?: boolean }) {
  return (
    <button onClick={onClick} title={title}
      className={"w-7 h-7 flex items-center justify-center rounded text-xs hover:bg-slate-100 transition-colors " + (active ? "bg-slate-200 text-blue-600" : "text-slate-500")}>
      {children}
    </button>
  );
}

function ToolDivider() { return <div className="w-px h-5 bg-slate-200 shrink-0" />; }

interface NoteNode { noteId: string; title: string; type: string; mime: string; content?: string; children: NoteNode[]; dateCreated?: string; dateModified?: string; }

function TreeNode({ node, depth, activeId, onSelect }: { node: NoteNode; depth: number; activeId: string; onSelect: (id: string) => void }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isActive = node.noteId === activeId;
  const isFolder = node.type === "book";
  return (
    <div>
      <div
        className={"flex items-center gap-1 px-2 py-1.5 text-xs cursor-pointer rounded group hover:bg-slate-700/50 transition-colors " + (isActive ? "bg-blue-600/30 text-white" : "text-slate-300")}
        style={{ paddingLeft: (8 + depth * 16) + "px" }}
        onClick={() => onSelect(node.noteId)}>
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="w-4 h-4 flex items-center justify-center shrink-0 hover:bg-slate-600 rounded">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ) : <div className="w-4 shrink-0" />}
        <span className="shrink-0">{isFolder ? String.fromCodePoint(128193) : String.fromCodePoint(128196)}</span>
        <span className="truncate flex-1">{node.title || "\u672A\u547D\u540D"}</span>
      </div>
      {expanded && hasChildren && node.children.map((child) => (
        <TreeNode key={child.noteId} node={child} depth={depth + 1} activeId={activeId} onSelect={onSelect} />
      ))}
    </div>
  );
}

'''
  idx = c.find('export default')
  if idx > 0:
    c = c[:idx] + ins + c[idx:]
open(sys.argv[1], 'w', encoding='utf-8').write(c)
print('OK')