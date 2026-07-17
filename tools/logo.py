"""Rendu du logo TacTic — reproduit exactement /mnt/user-data/outputs/logo.svg,
tel qu'approuvé après ajustements successifs (pastel, anneau gris, disque bleu).
"""
from PIL import Image, ImageDraw

BLUE   = (128, 162, 175)   # #80A2AF — disque central
GRAY   = (140, 140, 140)   # #8C8C8C — anneau, axe, petits rayons
PASTEL = [(206,128,144), (126,165,151), (215,173,98), (165,151,193),
          (206,128,144), (126,165,151), (215,173,98)]  # les 7 rayons longs, dans l'ordre du SVG

LONG = [((50.00,39.00),(50.00,18.00)), ((57.78,42.22),(72.63,27.37)),
        ((61.00,50.00),(82.00,50.00)), ((50.00,61.00),(50.00,82.00)),
        ((42.22,57.78),(27.37,72.63)), ((39.00,50.00),(18.00,50.00)),
        ((42.22,42.22),(27.37,27.37))]
SHORT = [((54.21,39.84),(59.57,26.90)), ((60.16,45.79),(73.10,40.43)),
         ((60.16,54.21),(73.10,59.57)), ((54.21,60.16),(59.57,73.10)),
         ((45.79,60.16),(40.43,73.10)), ((39.84,54.21),(26.90,59.57)),
         ((39.84,45.79),(26.90,40.43)), ((45.79,39.84),(40.43,26.90))]
AXIS = ((74.04,74.04),(56.08,56.08))

def render(size, bg=None, ss=8):
    S = size * ss
    im = Image.new('RGBA', (S, S), (bg + (255,)) if bg else (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    sc = S / 100
    def line(p0, p1, col, w):
        d.line([p0[0]*sc, p0[1]*sc, p1[0]*sc, p1[1]*sc], fill=col+(255,),
               width=max(1, round(w*sc)), joint='curve')
        for p in (p0, p1):           # stroke-linecap="round"
            r = w*sc/2
            d.ellipse([p[0]*sc-r, p[1]*sc-r, p[0]*sc+r, p[1]*sc+r], fill=col+(255,))
    d.ellipse([50*sc-6*sc, 50*sc-6*sc, 50*sc+6*sc, 50*sc+6*sc], fill=BLUE+(255,))
    for (p0, p1), col in zip(LONG, PASTEL): line(p0, p1, col, 1.1)
    for p0, p1 in SHORT: line(p0, p1, GRAY, 0.8)
    d.ellipse([50*sc-8*sc, 50*sc-8*sc, 50*sc+8*sc, 50*sc+8*sc], outline=GRAY+(255,), width=round(1.1*sc))
    line(AXIS[0], AXIS[1], GRAY, 1.1)
    return im.resize((size, size), Image.LANCZOS)

PAPER = (247, 244, 243)

# À 16 px le soleil complet s'évapore. La favicon garde ce qui porte le sens —
# le disque, l'anneau et son axe — et laisse tomber les rayons.
FAVICON = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\
<circle cx="50" cy="50" r="19" fill="#80A2AF"/>\
<circle cx="50" cy="50" r="30" fill="none" stroke="#8C8C8C" stroke-width="5"/>\
<line x1="88" y1="88" x2="63" y2="63" stroke="#8C8C8C" stroke-width="5" stroke-linecap="round"/>\
</svg>'''

if __name__ == '__main__':
    # Fond opaque obligatoire : iOS compose la transparence sur du noir.
    for s in (180, 192, 512, 1024):
        render(s, bg=PAPER).save(f'icon-{s}.png')
    render(512).save('logo.png')                    # transparent, pour le README
    open('favicon.svg', 'w').write(FAVICON)
    inner = open('logo.svg').read()
    inner = inner[inner.index('<title>'):inner.rindex('</svg>')]
    open('icon.svg', 'w').write(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="TacTic">'
      '<rect width="100" height="100" rx="21" fill="#F7F4F3"/>' + inner + '</svg>')
    print('icônes opaques + favicon simplifiée')
