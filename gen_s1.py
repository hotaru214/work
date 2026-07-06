import sys
c = open(sys.argv[1], 'r', encoding='utf-8').read()
c = c.replace('const { subSidebarOpen, toggleSubSidebar, setSubSidebarOpen } = useSidebar();', 'const { mainSidebarOpen, subSidebarOpen, toggleSubSidebar, setSubSidebarOpen } = useSidebar();')
open(sys.argv[1], 'w', encoding='utf-8').write(c)
print('Applied: mainSidebarOpen')