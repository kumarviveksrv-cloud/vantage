#!/usr/bin/env python3
"""Builds legal/extracts/*.txt: verbatim section extracts from legal/full/*.txt.
Re-run after replacing a full-text file when the law changes:  python3 legal/build_extracts.py
Nothing is paraphrased. Each section is copied line for line."""
import re, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
FULL = os.path.join(HERE, 'full'); OUT = os.path.join(HERE, 'extracts')
SRC = {'osh': ('osh-code-2020.txt', 'Occupational Safety, Health and Working Conditions Code, 2020'),
       'wages': ('code-on-wages-2019.txt', 'Code on Wages, 2019')}
TOPICS = {
 'hours-overtime-leave': ('Hours of work, overtime, leave: Wages Code ss.13-14; OSH Code ss.24-29, 31-32',
    [('wages', [13, 14]), ('osh', [24, 25, 26, 27, 28, 29, 31, 32])]),
 'contract-labour-licensing': ('Contract labour, licensing, registration: OSH Code ss.3, 7, 45-58, 78-79',
    [('osh', [3, 7, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 78, 79])]),
 'registers-returns-savings': ('Registers, returns, rules-making and savings: Wages Code ss.50-51, 69; OSH Code ss.10-12, 33, 35, 130-135, 143',
    [('wages', [50, 51, 69]), ('osh', [10, 11, 12, 33, 35, 130, 131, 133, 134, 135, 143])]),
}
START = re.compile(r'^\s{0,8}(\d{1,3})\. [A-Z]')
def load(key):
    lines = open(os.path.join(FULL, SRC[key][0]), encoding='utf-8').read().split('\n')
    body_start = next(i for i, l in enumerate(lines) if re.match(r'^\s*BE it enacted|^\s*CHAPTER I\b', l))
    starts = []; expect = 1
    for i in range(body_start, len(lines)):
        m = START.match(lines[i])
        if m and int(m.group(1)) >= expect and int(m.group(1)) <= expect + 3 and '—' in ' '.join(lines[i:i+2]):
            starts.append((int(m.group(1)), i)); expect = int(m.group(1)) + 1
    return lines, starts
def section(key, n, cache={}):
    if key not in cache: cache[key] = load(key)
    lines, starts = cache[key]
    for j, (num, i) in enumerate(starts):
        if num == n:
            end = starts[j+1][1] if j+1 < len(starts) else len(lines)
            blk = lines[i:end]
            for k, l in enumerate(blk):
                if re.match(r'^\s*(THE .*SCHEDULE|STATEMENT OF OBJECTS|NOTES ON CLAUSES)\b', l): blk = blk[:k]; break
            while blk and (not blk[-1].strip() or re.match(r'^\s*(CHAPTER|THE .*SCHEDULE|[A-Z ,\-]{6,}$)', blk[-1])): blk.pop()
            return blk
    raise SystemExit('section %s %s not found' % (key, n))
os.makedirs(OUT, exist_ok=True)
for name, (title, parts) in TOPICS.items():
    out = ['VERBATIM EXTRACT. Sections copied unaltered from the full texts in legal/full/. Title: ' + title, '']
    for key, nums in parts:
        out.append('=== ' + SRC[key][1] + ' ===')
        for n in nums:
            out += section(key, n) + ['']
    open(os.path.join(OUT, name + '.txt'), 'w', encoding='utf-8', newline='\n').write('\n'.join(out).rstrip() + '\n')
    print(name, len(' '.join(out).split()), 'words')
