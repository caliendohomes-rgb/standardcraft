import os

files = [
    'src/layouts/Layout.astro',
    'src/pages/dashboard.astro',
    'src/pages/account.astro',
    'src/pages/claim-free.astro',
    'src/pages/pricing.astro',
    'src/pages/resources/[slug].astro',
]

# Each tuple: (garbled_unicode_codepoints, correct_character)
# Garbled = original UTF-8 bytes misread as CP1252, then saved as UTF-8
# Order: longer/more-specific sequences first
replacements = [
    ('ðŸŽ‰', '\U0001F389'),  # party emoji
    ('â€”',       '—'),       # em dash  —
    ('â€™',       '’'),       # right single quote  '
    ('â€œ',       '“'),       # left double quote  "
    ('â€¦',       '…'),       # ellipsis  …
    ('â†’',       '→'),       # right arrow  →
    ('â€º',       '›'),       # right angle quote  ›
    ('Â·',             '·'),       # middle dot  ·
    ('Â§',             '§'),       # section sign  §
    ('Â©',             '©'),       # copyright  ©
    ('âœ“',       '✓'),       # check mark  ✓
    ('â€',       '”'),       # right double quote  "
    ('â†',       '←'),       # left arrow  ←
]

base = os.path.dirname(os.path.abspath(__file__))

for rel in files:
    path = os.path.join(base, rel)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    for bad, good in replacements:
        content = content.replace(bad, good)
    if content != original:
        with open(path, 'w', encoding='utf-8', newline='') as f:
            f.write(content)
        print('Fixed: ' + rel)
    else:
        print('No changes: ' + rel)
