import sys
c = open(sys.argv[1], 'r', encoding='utf-8').read()
if 'dropdownRef' not in c:
  c = c.replace('const saveTimerRef = useRef<number>(0);', 'const saveTimerRef = useRef<number>(0);\n  const dropdownRef = useRef<HTMLDivElement>(null);')
open(sys.argv[1], 'w', encoding='utf-8').write(c)
print('OK')