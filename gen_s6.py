import sys
c = open(sys.argv[1], 'r', encoding='utf-8').read()
if 'handleTreeSelect' not in c:
  fn = '''  function handleTreeSelect(noteId: string) {
    const isFolder = note?.type === "book" && note?.noteId === noteId;
    if (isFolder) {
      navigate(\"/kb/\" + noteId);
    } else {
      navigate(\"/kb/\" + notebookId + \"/doc/\" + noteId);
    }
  }

'''
  c = c.replace('async function handleCreate()', fn + '  async function handleCreate()')
open(sys.argv[1], 'w', encoding='utf-8').write(c)
print('OK')