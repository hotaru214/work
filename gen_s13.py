import sys
c = open(sys.argv[1], 'r', encoding='utf-8').read()
old = '''  const scheduleSave = useCallback(() => {
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
newf = '''  const titleRef = useRef(title);
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
  }, [isBook]);'''
if old in c:
  c = c.replace(old, newf)
open(sys.argv[1], 'w', encoding='utf-8').write(c)
print('OK')