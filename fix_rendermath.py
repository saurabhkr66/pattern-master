with open('components/test/TestEngine.tsx', 'rb') as f:
    content = f.read()

# Markers
box = b'\xe2\x94\x80' * 15
old_start = b'/* ' + box + b' Math helper ' + box + b' */'
old_end   = b'function MathText'

start_idx = content.find(old_start)
end_idx   = content.find(old_end)

if start_idx == -1 or end_idx == -1:
    print('Markers not found! start=%d end=%d' % (start_idx, end_idx))
    exit(1)

lsq = '‘'.encode('utf-8')
rsq = '’'.encode('utf-8')
ldq = '“'.encode('utf-8')
rdq = '”'.encode('utf-8')
apr = 'ʼ'.encode('utf-8')
en  = '–'.encode('utf-8')
em  = '—'.encode('utf-8')
ell = '…'.encode('utf-8')

lines = [
    b'/* ' + box + b' Math helper ' + box + b' */\n',
    b'function renderMath(text: string): string {\n',
    b"  if (!text) return '';\n",
    b'  let t = text\n',
    b"    .replace(/[" + lsq + rsq + apr + b"]/g, \"'\")\n",
    b'    .replace(/[' + ldq + rdq + b']/g, \'"\')\n',
    b'    .replace(/[' + en + em + b']/g, \'-\')\n',
    b'    .replace(/' + ell + b"/g, '...');\n",
    b'  // Break adjacent inline-math junctions: $A$$B$ becomes $A$ $B$\n',
    b"  t = t.replace(/\\$\\$/g, '$ $');\n",
    b'  t = t.replace(/\\\\\\\[([\\s\\S]*?)\\\\\\\\]/g, (_: string, m: string) => {\n',
    b'    try { return \'<span class="math-block">\' + katex.renderToString(m.trim(), { displayMode: true, throwOnError: false }) + \'</span>\'; }\n',
    b"    catch { return '<span>[math]</span>'; }\n",
    b'  });\n',
    b'  t = t.replace(/\\\\\\(([\\s\\S]*?)\\\\\\\)/g, (_: string, m: string) => {\n',
    b"    try { return katex.renderToString(m.trim(), { displayMode: false, throwOnError: false }); }\n",
    b"    catch { return '[math]'; }\n",
    b'  });\n',
    b'  t = t.replace(/\\$\\$([^$]+?)\\$\\$/g, (_: string, m: string) => {\n',
    b'    try { return \'<span class="math-block">\' + katex.renderToString(m.trim(), { displayMode: true, throwOnError: false }) + \'</span>\'; }\n',
    b"    catch { return '<span>[math]</span>'; }\n",
    b'  });\n',
    b'  t = t.replace(/\\$([^$\\n]+?)\\$/g, (_: string, m: string) => {\n',
    b"    try { return katex.renderToString(m.trim(), { displayMode: false, throwOnError: false }); }\n",
    b"    catch { return '[math]'; }\n",
    b'  });\n',
    b'  return t;\n',
    b'}\n',
    b'\n',
]

replacement = b''.join(lines) + b'function MathText'
new_content = content[:start_idx] + replacement + content[end_idx + len(b'function MathText'):]

with open('components/test/TestEngine.tsx', 'wb') as f:
    f.write(new_content)
print('Done. Lines replaced:', len(lines))
