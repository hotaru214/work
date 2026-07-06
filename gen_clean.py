import sys
c = open(sys.argv[1], 'r', encoding='utf-8').read()
c = c.replace('''function ToolBtn({ children, onClick, title = "", active = false }: { children: React.ReactNode; onClick: () => void; title?: string; active?: boolean }) {
  function SubToggle() {
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

  return (''', '''function ToolBtn({ children, onClick, title = "", active = false }: { children: React.ReactNode; onClick: () => void; title?: string; active?: boolean }) {
  return (''
c = c.replace('''  const titleRef = useRef(title);
  titleRef.current = title;
  const activeNoteIdRef = useRef(activeNoteId);
  activeNoteIdRef.current = activeNoteId;
  const noteRef = useRef(note);
  noteRef.current = note;

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setSaveStatus("");
    saveTimerRef.current = window.setTimeout(async () => {
      const currentId = activeNoteIdRef.current;
      const currentTitle = titleRef.current;
      const htmlContent = isBook ? undefined : (editorRef.current?.innerHTML || "");
      setSaveStatus("\u4FDD\u5B58\u4E2D...");
      try {
        const data: any = { title: currentTitle };
        if (htmlContent !== undefined) data.content = htmlContent;
        await api.kb.updateContent(currentId, data);
        if (htmlContent !== undefined) setContent(htmlContent);
        setSaveStatus("\u5DF2\u4FDD\u5B58");
        saveTimerRef.current = 0;
        setTimeout(() => setSaveStatus(""), 2000);
      } catch { setSaveStatus(""); }
    }, SAVE_DELAY);
  }, [isBook]);''', '''  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setSaveStatus("");
    saveTimerRef.current = window.setTimeout(async () => {
      const currentId = activeNoteIdRef.current;
      const currentTitle = titleRef.current;
      const htmlContent = isBook ? undefined : (editorRef.current?.innerHTML || "");
      setSaveStatus("\u4FDD\u5B58\u4E2D...");
      try {
        const data: any = { title: currentTitle };
        if (htmlContent !== undefined) data.content = htmlContent;
        await api.kb.updateContent(currentId, data);
        if (htmlContent !== undefined) setContent(htmlContent);
        setSaveStatus("\u5DF2\u4FDD\u5B58");
        saveTimerRef.current = 0;
        setTimeout(() => setSaveStatus(""), 2000);
      } catch { setSaveStatus(""); }
    }, SAVE_DELAY);
  }, [isBook]);''
first_ref = c.find('const titleRef = useRef(title)')
second_ref = c.find('const titleRef = useRef(title)', first_ref + 50)
if second_ref > 0:
  # Find the block to remove - from second_ref up to scheduleSave
  sch = c.find('const scheduleSave', second_ref)
  if sch > 0:
    c = c[:second_ref] + c[sch:]
old_sch = '''  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setSaveStatus("");
    saveTimerRef.current = window.setTimeout(async () => {
      const htmlContent = editorRef.current?.innerHTML || "";
      setSaveStatus("\u4FDD\u5B58\u4E2D...");
      try {
        await api.kb.updateContent(activeNoteId, { title, content: htmlContent });
        setContent(htmlContent);
        setSaveStatus("\u5DF2\u4FDD\u5B58");
        saveTimerRef.current = 0;
        setTimeout(() => setSaveStatus(""), 2000);
      } catch { setSaveStatus(""); }
    }, SAVE_DELAY);
  }, [title, activeNoteId]);'''
c = c.replace(old_sch, '')
old_exec = '''  function execCommand(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
    if (editorRef.current) editorRef.current.focus();
  }'''
c = c.replace(old_exec, '')
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
c = c.replace('execCommand("formatBlock", "<blockquote>")', 'execCmd("formatBlock","<blockquote>")')
c = c.replace('execCommand("formatBlock", "<pre>")', 'execCmd("formatBlock","<pre>")')
c = c.replace('''  return (
    <button onClick={onClick} title={title}
      className={"w-7 h-7 flex items-center justify-center rounded text-xs hover:bg-slate-100 transition-colors " + (active ? "bg-slate-200 text-blue-600" : "text-slate-500")}>
      {children}''', '''  return (
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

    <button onClick={onClick} title={title}
      className={"w-7 h-7 flex items-center justify-center rounded text-xs hover:bg-slate-100 transition-colors " + (active ? "bg-slate-200 text-blue-600" : "text-slate-500")}>
      {children}''')
open(sys.argv[1], 'w', encoding='utf-8').write(c)
print('Cleanup done')