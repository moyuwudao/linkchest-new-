f = open('/tmp/full-bundle.js').read()

# Find loadTranslationSync function definition
idx = f.find('function loadTranslationSync')
if idx >= 0:
    print('=== loadTranslationSync function ===')
    print(f[idx:idx+800])
    print()
else:
    # Try arrow function
    idx = f.find('loadTranslationSync=')
    if idx >= 0:
        print('=== loadTranslationSync (arrow) ===')
        print(f[idx:idx+800])
        print()
    else:
        print('loadTranslationSync not found')

# Find the switch statement for locales
idx = f.find("case 'zh':")
if idx >= 0:
    print('=== zh case ===')
    print(f[max(0, idx-100):idx+200])
