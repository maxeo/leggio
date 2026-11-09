# Crea le icone PNG del lettore partendo da icona.svg (per iPhone e per le app installate su Android).
# Uso: python strumenti/icone.py [icona.svg] [cartella di uscita]
# Valori predefiniti: lettore/icona.svg e lettore/. Richiede resvg_py (pip install resvg_py).
#
# Scrive:
#   icona-192.png, icona-512.png   l'icona com'è, con gli angoli arrotondati trasparenti
#   icona-180.png                  per la schermata Home di iPhone: quadrato pieno, gli angoli li arrotonda iOS
#   icona-maskable.png             512 px a quadrato pieno con il disegno più piccolo, per le icone adattive di Android
# Il quadrato pieno si ottiene togliendo l'arrotondamento (rx) dal primo rettangolo dell'SVG, che fa da sfondo.
import os, re, sys
import resvg_py

radice = os.path.join(os.path.dirname(__file__), '..', 'lettore')
svg_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(radice, 'icona.svg')
uscita = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(svg_path)

svg = open(svg_path, encoding='utf-8').read()
def pieno(margine=1.0):
    # Quadrato pieno: il primo rettangolo perde l'arrotondamento e copre tutto il viewBox.
    # margine > 1 allarga il viewBox attorno al centro, così il disegno si rimpicciolisce.
    s = re.sub(r'(<rect\b[^>]*?)\s+rx="[^"]*"', r'\1', svg, count=1)
    vb = re.search(r'viewBox="([^"]+)"', s)
    if not vb:
        return s
    x, y, w, h = map(float, vb.group(1).split())
    cx, cy, w, h = x + w / 2, y + h / 2, w * margine, h * margine
    x, y = cx - w / 2, cy - h / 2
    s = s.replace(vb.group(0), f'viewBox="{x:g} {y:g} {w:g} {h:g}"', 1)
    return re.sub(r'<rect\b[^>]*?/>', lambda m: re.sub(r'\s(x|y|width|height)="[^"]*"', '', m.group(0)).replace(
        '<rect', f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}"', 1), s, count=1)

def scrivi(testo, lato, nome):
    png = resvg_py.svg_to_bytes(svg_string=testo, width=lato, height=lato)
    with open(os.path.join(uscita, nome), 'wb') as f:
        f.write(bytes(png))
    print(nome)

scrivi(svg, 192, 'icona-192.png')
scrivi(svg, 512, 'icona-512.png')
scrivi(pieno(), 180, 'icona-180.png')
# Android ritaglia l'icona adattiva anche a cerchio: il disegno deve stare nel cerchio centrale (80% del lato).
scrivi(pieno(1.15), 512, 'icona-maskable.png')
