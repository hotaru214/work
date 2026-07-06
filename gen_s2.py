import sys
c = open(sys.argv[1], 'r', encoding='utf-8').read()
if 'FONT_SIZES' not in c:
  c = c.replace('const SAVE_DELAY = 2000;', 'const FONT_SIZES = ["12","14","16","18","20","24","28","32","36","48","64"];\nconst SAVE_DELAY = 2000;')
open(sys.argv[1], 'w', encoding='utf-8').write(c)
print('OK')