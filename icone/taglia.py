# Taglia un mosaico N x N di icone nelle singole celle e crea fogli ingranditi con le etichette, per scegliere.
# Uso: python taglia.py <mosaico.png> <cartella di uscita> [N=16]
import sys, os
from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
N = int(sys.argv[3]) if len(sys.argv) > 3 else 16
img = Image.open(src).convert('RGB')
W, H = img.size
os.makedirs(os.path.join(out, 'celle'), exist_ok=True)


# Le bande di icone si trovano dove righe e colonne non sono quasi tutte sfondo (lo sfondo è il colore dell'angolo).
sfondo = img.getpixel((2, 2))
px = img.load()
def e_sfondo(p):
    return sum(abs(a - b) for a, b in zip(p, sfondo)) < 40
def bande(lung, quota):
    piene = [quota(i) < 0.75 for i in range(lung)]
    b, i = [], 0
    while i < lung:
        if piene[i]:
            j = i
            while j < lung and piene[j]: j += 1
            if j - i > lung / (N * 4): b.append((i, j))
            i = j
        else: i += 1
    return b
qc = lambda x: sum(e_sfondo(px[x, y]) for y in range(0, H, 3)) / len(range(0, H, 3))
qr = lambda y: sum(e_sfondo(px[x, y]) for x in range(0, W, 3)) / len(range(0, W, 3))
piu_lunghe = lambda b: sorted(sorted(b, key=lambda t: t[0] - t[1])[:N])
bx, by = piu_lunghe(bande(W, qc)), piu_lunghe(bande(H, qr))
if len(bx) == N and len(by) == N:
    xs = [a for a, _ in bx]; xe = [b for _, b in bx]; ys = [a for a, _ in by]; ye = [b for _, b in by]
else:
    print('bande trovate', len(bx), len(by), ': divisione regolare')
    xs = [round(k * W / N) for k in range(N)]; xe = xs[1:] + [W]; ys = [round(k * H / N) for k in range(N)]; ye = ys[1:] + [H]
celle = {}
for r in range(N):
    for c in range(N):
        cella = img.crop((xs[c], ys[r], xe[c], ye[r]))
        nome = f'{r + 1:02d}-{c + 1:02d}'
        cella.save(os.path.join(out, 'celle', nome + '.png'))
        celle[(r, c)] = cella

# Fogli da 8 x 8 celle ingrandite, con l'etichetta riga-colonna.
LATO, ETI = 128, 18
for fr in range(0, N, 8):
    for fc in range(0, N, 8):
        foglio = Image.new('RGB', (8 * LATO, 8 * (LATO + ETI)), 'white')
        d = ImageDraw.Draw(foglio)
        for r in range(fr, min(fr + 8, N)):
            for c in range(fc, min(fc + 8, N)):
                x, y = (c - fc) * LATO, (r - fr) * (LATO + ETI)
                foglio.paste(celle[(r, c)].resize((LATO, LATO), Image.LANCZOS), (x, y))
                d.text((x + 4, y + LATO + 2), f'{r + 1:02d}-{c + 1:02d}', fill='black')
        foglio.save(os.path.join(out, f'foglio-r{fr + 1:02d}-c{fc + 1:02d}.png'))
print(W, H, 'celle', N * N)
