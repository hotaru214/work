import sys
c = open(sys.argv[1], 'r', encoding='utf-8').read()
if 'dropdownRef' in c and 'setShowFontSize(false)' not in c[c.find('useEffect'):c.find('useEffect')+400]:
  effect = '''
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowFontSize(false); setShowColor(false); setShowBgColor(false); setShowHeading(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

'''
  ef_idx = c.find('useEffect(() => {')
  if ef_idx > 0:
    c = c[:ef_idx] + effect + c[ef_idx:]
open(sys.argv[1], 'w', encoding='utf-8').write(c)
print('OK')