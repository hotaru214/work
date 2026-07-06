import sys
c = open(sys.argv[1], 'r', encoding='utf-8').read()
old = '''  useEffect(() => {
    if (activeNoteId) {
      setSubSidebarOpen(true);
      loadNote();
      if (notebookId) loadTree();
    }
  }, [activeNoteId, notebookId]);'''
newf = '''  useEffect(() => {
    if (saveTimerRef.current) { window.clearTimeout(saveTimerRef.current); saveTimerRef.current = 0; }
    setSaveStatus("");
    if (activeNoteId) {
      setSubSidebarOpen(true);
      loadNote();
      if (notebookId) loadTree();
    }
  }, [activeNoteId, notebookId]);'''
if old in c:
  c = c.replace(old, newf)
open(sys.argv[1], 'w', encoding='utf-8').write(c)
print('OK')