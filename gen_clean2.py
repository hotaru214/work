import sys
c = open(sys.argv[1], 'r', encoding='utf-8').read()
import re
idx1 = c.find('const titleRef = useRef(title)')
idx2 = c.find('const titleRef = useRef(title)', idx1 + 50)
if idx2 > 0:
    sch = c.find('const scheduleSave', idx2)
    if sch > 0:
        c = c[:idx2] + c[sch:]
old_sch = 'const scheduleSave = useCallback(() => {\n    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);\n    setSaveStatus("");\n    saveTimerRef.current = window.setTimeout(async () => {\n      const htmlContent = editorRef.current?.innerHTML || "";\n      setSaveStatus("\\u4FDD\\u5B58\\u4E2D...");\n      try {\n        await api.kb.updateContent(activeNoteId, { title, content: htmlContent });\n        setContent(htmlContent);\n        setSaveStatus("\\u5DF2\\u4FDD\\u5B58");\n        saveTimerRef.current = 0;\n        setTimeout(() => setSaveStatus(""), 2000);\n      } catch { setSaveStatus(""); }\n    }, SAVE_DELAY);\n  }, [title, activeNoteId]);'
if old_sch in c:
    c = c.replace(old_sch, '')
for fn in ['handleImage', 'getWordCount', 'execCommand']:
    idx1 = c.find('function ' + fn)
    idx2 = c.find('function ' + fn, idx1 + 10)
    if idx2 > 0:
        # Find the end of the second function
        end = c.find('\n  function', idx2 + 10)
        if end < 0: end = c.find('\n  export', idx2)
        if end > 0: c = c[:idx2] + c[end:]
for cmd in ['bold','italic','underline','strikeThrough','justifyLeft','justifyCenter','justifyRight','insertUnorderedList','insertOrderedList','undo','redo','removeFormat','insertHorizontalRule']:
    c = c.replace("execCommand('" + cmd + "')", "execCmd('" + cmd + "')")
    c = c.replace('execCommand("' + cmd + '")', 'execCmd("' + cmd + '")')
c = c.replace('execCommand("formatBlock", "<blockquote>")', 'execCmd("formatBlock","<blockquote>")')
c = c.replace('execCommand("formatBlock", "<pre>")', 'execCmd("formatBlock","<pre>")')
c = c.replace('execCommand("formatBlock", "<h1>")', 'execCmd("formatBlock","<h1>")')
c = c.replace('execCommand("formatBlock", "<h2>")', 'execCmd("formatBlock","<h2>")')
c = c.replace('execCommand("formatBlock", "<h3>")', 'execCmd("formatBlock","<h3>")')
c = c.replace('execCommand("insertImage", url)', 'execCmd("insertImage", url)')
c = c.replace('execCommand("createLink", url)', 'execCmd("createLink", url)')
if 'SubToggle' not in c:
    sub = '''\n  function SubToggle() {\n    const leftPos = mainSidebarOpen ? "calc(14rem + 4px)" : "4px";\n    return (\n      <button onClick={toggleSubSidebar}\n        className="absolute z-30 top-14 w-6 h-8 flex items-center justify-center rounded-r hover:bg-slate-200 bg-white/90 shadow-sm text-slate-500 border border-slate-200"\n        style={{ left: leftPos, transition: "left 0.2s" }}\n        title={subSidebarOpen ? "\\u6536\\u8D77\\u76EE\\u5F55" : "\\u5C55\\u5F00\\u76EE\\u5F55"}>\n        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">\n          <polyline points={subSidebarOpen ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />\n        </svg>\n      </button>\n    );\n  }\n\n'''
    idx = c.find('  return (')
    if idx > 0: c = c[:idx] + sub + c[idx:]
open(sys.argv[1], 'w', encoding='utf-8').write(c)
print('Cleanup done')
