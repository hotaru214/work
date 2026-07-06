import sys
c = open(sys.argv[1], 'r', encoding='utf-8').read()
for kw in ['showFontSize','showColor','showBgColor','showHeading','dropdownRef','FONT_SIZES','handleColor','handleBgColor','handleFontSize','createTable','handleHeading']:
    print(kw + ': ' + ('YES' if kw in c else 'NO'))
