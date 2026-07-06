import sys, re
c = open(sys.argv[1], 'r', encoding='utf-8').read()
if 'FONT_SIZES' not in c:
  c = c.replace('const SAVE_DELAY = 2000;', 'const FONT_SIZES = ["12","14","16","18","20","24","28","32","36","48","64"];\nconst SAVE_DELAY = 2000;')
c = c.replace('const { subSidebarOpen, toggleSubSidebar, setSubSidebarOpen } = useSidebar();', 'const { mainSidebarOpen, subSidebarOpen, toggleSubSidebar, setSubSidebarOpen } = useSidebar();')
if 'showFontSize' not in c:
  c = c.replace('const [showCreateModal, setShowCreateModal] = useState(false);', 'const [showCreateModal, setShowCreateModal] = useState(false);\n  const [showFontSize, setShowFontSize] = useState(false);\n  const [showColor, setShowColor] = useState(false);\n  const [showBgColor, setShowBgColor] = useState(false);\n  const [showHeading, setShowHeading] = useState(false);')
if 'dropdownRef' not in c:
  c = c.replace('const saveTimerRef = useRef<number>(0);', 'const saveTimerRef = useRef<number>(0);\n  const dropdownRef = useRef<HTMLDivElement>(null);\n  const menuRef = useRef<HTMLDivElement>(null);')
var_old = '''  const scheduleSave = useCallback(() => {\
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);\
    setSaveStatus("");\
    saveTimerRef.current = window.setTimeout(async () => {\
      const htmlContent = editorRef.current?.innerHTML || "";\
      setSaveStatus("\u4fdd\u5b58\u4e2d...");\
      try {\
        await api.kb.updateContent(activeNoteId, { title, content: htmlContent });\
        setContent(htmlContent);\
        setSaveStatus("\u5df2\u4fdd\u5b58");\
        saveTimerRef.current = 0;\
        setTimeout(() => setSaveStatus(""), 2000);\
      } catch { setSaveStatus(""); }\
    }, SAVE_DELAY);\
  }, [title, activeNoteId]);'''
var_new = '''  const titleRef = useRef(title);\
  titleRef.current = title;\
  const activeNoteIdRef = useRef(activeNoteId);\
  activeNoteIdRef.current = activeNoteId;\
  const noteRef = useRef(note);\
  noteRef.current = note;\
\
  const scheduleSave = useCallback(() => {\
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);\
    setSaveStatus("");\
    saveTimerRef.current = window.setTimeout(async () => {\
      const currentId = activeNoteIdRef.current;\
      const currentTitle = titleRef.current;\
      const htmlContent = isBook ? undefined : (editorRef.current?.innerHTML || "");\
      setSaveStatus("\u4fdd\u5b58\u4e2d...");\
      try {\
        const data: any = { title: currentTitle };\
        if (htmlContent !== undefined) data.content = htmlContent;\
        await api.kb.updateContent(currentId, data);\
        if (htmlContent !== undefined) setContent(htmlContent);\
        setSaveStatus("\u5df2\u4fdd\u5b58");\
        saveTimerRef.current = 0;\
        setTimeout(() => setSaveStatus(""), 2000);\
      } catch { setSaveStatus(""); }\
    }, SAVE_DELAY);\
  }, [isBook]);'''
if var_old in c:
  c = c.replace(var_old, var_new)
old_exec = '''  function execCommand(cmd: string, value?: string) {\
    document.execCommand(cmd, false, value);\
    if (editorRef.current) editorRef.current.focus();\
  }'''
new_exec = '''  function execCmd(cmd: string, value?: string) {\
    document.execCommand(cmd, false, value);\
    if (editorRef.current) editorRef.current.focus();\
    scheduleSave();\
  }\
\
  function handleHeading(tag: string) {\
    document.execCommand("formatBlock", false, "<" + tag + ">");\
    setShowHeading(false);\
    if (editorRef.current) editorRef.current.focus();\
  }\
\
  function handleFontSize(size: string) {\
    const sel = window.getSelection();\
    if (sel && sel.rangeCount > 0) {\
      const span = document.createElement("span");\
      span.style.fontSize = size + "px";\
      try { sel.getRangeAt(0).surroundContents(span); } catch {}\
    }\
    setShowFontSize(false);\
    if (editorRef.current) editorRef.current.focus();\
  }\
\
  function handleColor(color: string) {\
    document.execCommand("styleWithCSS", false, "true");\
    execCmd("foreColor", color);\
    setShowColor(false);\
  }\
\
  function handleBgColor(color: string) {\
    document.execCommand("styleWithCSS", false, "true");\
    execCmd("hiliteColor", color);\
    setShowBgColor(false);\
  }\
\
  function handleImage() {\
    const url = prompt("\u8bf7\u8f93\u5165\u56fe\u7247\u5730\u5740");\
    if (url) execCmd("insertImage", url);\
  }\
\
  function createTable() {\
    const rows = prompt("\u884c\u6570", "3");\
    const cols = prompt("\u5217\u6570", "3");\
    if (rows && cols) {\
      let html = "<table border='1' style='border-collapse:collapse;width:100%;margin:0.5em 0'>";\
      for (let r = 0; r < parseInt(rows); r++) {\
        html += "<tr>";\
        for (let c = 0; c < parseInt(cols); c++) {\
          html += "<td style='padding:6px;border:1px solid #ccc'>&nbsp;</td>";\
        }\
        html += "</tr>";\
      }\
      html += "</table>";\
      document.execCommand("insertHTML", false, html);\
      if (editorRef.current) editorRef.current.focus();\
    }\
  }\
\
  function getWordCount() {\
    return (editorRef.current?.innerText || "").replace(/\\s/g, "").length;\
  }'''
if old_exec in c:
  c = c.replace(old_exec, new_exec)
c = c.replace('execCommand("bold")', 'execCmd("bold")')
c = c.replace('execCommand("italic")', 'execCmd("italic")')
c = c.replace('execCommand("underline")', 'execCmd("underline")')
c = c.replace('execCommand("strikeThrough")', 'execCmd("strikeThrough")')
c = c.replace('execCommand("justifyLeft")', 'execCmd("justifyLeft")')
c = c.replace('execCommand("justifyCenter")', 'execCmd("justifyCenter")')
c = c.replace('execCommand("justifyRight")', 'execCmd("justifyRight")')
c = c.replace('execCommand("insertUnorderedList")', 'execCmd("insertUnorderedList")')
c = c.replace('execCommand("insertOrderedList")', 'execCmd("insertOrderedList")')
c = c.replace('execCommand("undo")', 'execCmd("undo")')
c = c.replace('execCommand("redo")', 'execCmd("redo")')
c = c.replace('execCommand("removeFormat")', 'execCmd("removeFormat")')
c = c.replace('execCommand("insertHorizontalRule")', 'execCmd("insertHorizontalRule")')
c = c.replace('execCommand("formatBlock","<blockquote>")', 'execCmd("formatBlock","<blockquote>")')
c = c.replace('execCommand("formatBlock", "<pre>")', 'execCmd("formatBlock","<pre>")')
if 'handleTreeSelect' not in c:
  c = c.replace('async function handleCreate()', 'function handleTreeSelect(noteId: string) {\
    const isFolder = note?.type === "book" && note?.noteId === noteId;\
    if (isFolder) {\
      navigate(\`/kb/\${noteId}\`);\
    } else {\
      navigate(\`/kb/\${notebookId}/doc/\${noteId}\`);\
    }\
  }\
\
  async function handleCreate()')
if 'SubToggle' not in c:
  idx = c.find('  return (')
  if idx > 0:
    sub = '''  function SubToggle() {\
    const leftPos = mainSidebarOpen ? "calc(14rem + 4px)" : "4px";\
    return (\
      <button onClick={toggleSubSidebar}\
        className="absolute z-30 top-14 w-6 h-8 flex items-center justify-center rounded-r hover:bg-slate-200 bg-white/90 shadow-sm text-slate-500 border border-slate-200"\
        style={{ left: leftPos, transition: "left 0.2s" }}\
        title={subSidebarOpen ? "\u6536\u8d77\u76ee\u5f55" : "\u5c55\u5f00\u76ee\u5f55"}>\
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">\
          <polyline points={subSidebarOpen ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />\
        </svg>\
      </button>\
    );\
  }\
'''
    c = c[:idx] + sub + c[idx:]
old_toggle = '''{!subSidebarOpen && (\
        <button onClick={toggleSubSidebar} className="fixed top-16 z-30 w-8 h-8 flex items-center justify-center rounded hover:bg-slate-200 bg-white/80 shadow-sm text-slate-500" style={{ left: "0.75rem" }} title="\u5c55\u5f00\u76ee\u5f55">\
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>\
        </button>\
      )}'''
c = c.replace(old_toggle, '{!subSidebarOpen && (<SubToggle />)}')
old_tree = '''tree.map((n: any) => (\
              <div key={n.noteId} onClick={() => handleTreeSelect(n.noteId)}\
                className={\"flex items-center gap-2 px-3 py-2 text-sm cursor-pointer rounded-lg hover:bg-slate-700/50 transition-colors \" + (n.noteId === activeNoteId ? "bg-blue-600/20 text-white" : "text-slate-300")}>\
                <span>{n.type === "book" ? "\ud83d\udcc1" : "\ud83d\udcc4"}</span>\
                <span className="truncate">{n.title || "\u672a\u547d\u540d"}</span>\
              </div>\
            ))}'''
new_tree = '''tree.map((n) => (\
            <TreeNode key={n.noteId} node={n} depth={0} activeId={activeNoteId} onSelect={handleTreeSelect} />\
          ))}'''
if old_tree in c:
  c = c.replace(old_tree, new_tree)
if 'function TreeNode' not in c:
  ins = '''function ToolBtn({ children, onClick, title = "", active = false }: { children: React.ReactNode; onClick: () => void; title?: string; active?: boolean }) {\
  return (\
    <button onClick={onClick} title={title}\
      className={\`w-7 h-7 flex items-center justify-center rounded text-xs hover:bg-slate-100 transition-colors \${active ? "bg-slate-200 text-blue-600" : "text-slate-500"}\`}>\
      {children}\
    </button>\
  );\
}\
\
function ToolDivider() { return <div className="w-px h-5 bg-slate-200 shrink-0" />; }\
\
interface NoteNode { noteId: string; title: string; type: string; mime: string; content?: string; children: NoteNode[]; dateCreated?: string; dateModified?: string; }\
\
function TreeNode({ node, depth, activeId, onSelect }: { node: NoteNode; depth: number; activeId: string; onSelect: (id: string) => void }) {\
  const [expanded, setExpanded] = useState(true);\
  const hasChildren = node.children && node.children.length > 0;\
  const isActive = node.noteId === activeId;\
  const isFolder = node.type === "book";\
  return (\
    <div>\
      <div\
        className={\`flex items-center gap-1 px-2 py-1.5 text-xs cursor-pointer rounded group hover:bg-slate-700/50 transition-colors \${isActive ? "bg-blue-600/30 text-white" : "text-slate-300"}\`}\
        style={{ paddingLeft: \`\${8 + depth * 16}px\` }}\
        onClick={() => onSelect(node.noteId)}>\
        {hasChildren ? (\
          <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="w-4 h-4 flex items-center justify-center shrink-0 hover:bg-slate-600 rounded">\
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"\
              style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>\
              <polyline points="9 18 15 12 9 6" />\
            </svg>\
          </button>\
        ) : <div className="w-4 shrink-0" />}\
        <span className="shrink-0">{isFolder ? "\ud83d\udcc1" : "\ud83d\udcc4"}</span>\
        <span className="truncate flex-1">{node.title || "\u672a\u547d\u540d"}</span>\
      </div>\
      {expanded && hasChildren && node.children.map((child) => (\
        <TreeNode key={child.noteId} node={child} depth={depth + 1} activeId={activeId} onSelect={onSelect} />\
      ))}}\
    </div>\
  );\
}\
\
'''
  exp_idx = c.find('export default')
  if exp_idx > 0:
    c = c[:exp_idx] + ins + c[exp_idx:]
old_tb = '''<div className="px-2 py-1 border-b bg-slate-50 flex items-center gap-1 flex-wrap shrink-0">\
              <button onClick={() => execCmd("bold")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200 text-slate-600 text-xs font-bold" title="\u7c97\u4f53">B</button>\
              <button onClick={() => execCmd("italic")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200 text-slate-600 text-xs italic" title="\u659c\u4f53">I</button>\
              <button onClick={() => execCmd("underline")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200 text-slate-600 text-xs" title="\u4e0b\u5212\u7ebf">U</button>\
              <div className="w-px h-5 bg-slate-200 mx-1" />\
              <button onClick={handleImage} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 text-xs" title="\u56fe\u7247">\ud83d\uddbc\ufe0f</button>\
              <div className="w-px h-5 bg-slate-200 mx-1" />\
              <button onClick={() => execCmd("formatBlock", "<h1>")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 text-xs" title="\u6807\u98981">H1</button>\
              <button onClick={() => execCmd("formatBlock", "<h2>")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 text-xs" title="\u6807\u98982">H2</button>\
              <button onClick={() => execCmd("formatBlock", "<h3>")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 text-xs" title="\u6807\u98983">H3</button>\
              <div className="w-px h-5 bg-slate-200 mx-1" />\
              <button onClick={() => execCmd("insertUnorderedList")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 text-xs" title="\u5217\u8868">\u2022</button>\
              <button onClick={() => execCmd("insertOrderedList")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 text-xs" title="\u6709\u5e8f\u5217\u8868">1.</button>\
              <button onClick={() => execCmd("formatBlock", "<blockquote>")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 text-xs" title="\u5f15\u7528">\u275d</button>\
            </div>'''
new_tb = open(sys.argv[2], 'r', encoding='utf-8').read()
if old_tb in c:
  c = c.replace(old_tb, new_tb)
open(sys.argv[1], 'w', encoding='utf-8').write(c)
print('All patches applied')