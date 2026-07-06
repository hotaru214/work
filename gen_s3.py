import sys
c = open(sys.argv[1], 'r', encoding='utf-8').read()
if 'showFontSize' not in c:
  c = c.replace('const [showCreateModal, setShowCreateModal] = useState(false);', 'const [showCreateModal, setShowCreateModal] = useState(false);\n  const [showFontSize, setShowFontSize] = useState(false);\n  const [showColor, setShowColor] = useState(false);\n  const [showBgColor, setShowBgColor] = useState(false);\n  const [showHeading, setShowHeading] = useState(false);')
open(sys.argv[1], 'w', encoding='utf-8').write(c)
print('OK')