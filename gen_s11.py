import sys
c = open(sys.argv[1], 'r', encoding='utf-8').read()
oldt = '''tree.map((n: any) => (
              <div key={n.noteId} onClick={() => handleTreeSelect(n.noteId)}
                className={"flex items-center gap-2 px-3 py-2 text-sm cursor-pointer rounded-lg hover:bg-slate-700/50 transition-colors " + (n.noteId === activeNoteId ? "bg-blue-600/20 text-white" : "text-slate-300")}>
                <span>{n.type === "book" ? "\uD83D\uDCC1" : "\uD83D\uDCC4"}</span>
                <span className="truncate">{n.title || "\u672A\u547D\u540D"}</span>
              </div>
            ))}'''
newt = '''tree.length > 0 ? tree.map((n) => (
            <TreeNode key={n.noteId} node={n} depth={0} activeId={activeNoteId} onSelect={handleTreeSelect} />
          )) : ('''
if oldt in c:
  c = c.replace(oldt, newt)
open(sys.argv[1], 'w', encoding='utf-8').write(c)
print('OK')