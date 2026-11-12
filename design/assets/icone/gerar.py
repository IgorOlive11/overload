# Gera os ícones do PWA a partir da arte em design/assets/icone/icone-original.jpg.
import sys
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

# Uso: python3 design/assets/icone/gerar.py design/assets/icone/icone-original.jpg public/icones previa.png
# Depois: mova favicon.ico e favicon-32.png de public/icones para public/ e comprima com oxipng (pip install pyoxipng).
fonte, saida, previa = sys.argv[1], sys.argv[2], sys.argv[3]
arte = Image.open(fonte).convert("RGB").crop((112, 104, 912, 904))  # sem a moldura e os parafusos
# Um pouco mais de contraste e cor: a pedra cinza some sobre o fundo escuro em tamanho pequeno.
arte = ImageEnhance.Contrast(arte).enhance(1.12)
arte = ImageEnhance.Color(arte).enhance(1.08)

def reduzir(img, lado, nitidez=True):
    r = img.resize((lado, lado), Image.LANCZOS)
    if nitidez and lado <= 256:
        r = r.filter(ImageFilter.UnsharpMask(radius=1, percent=60, threshold=2))
    return r

def limpar(img, cores=96):
    # Paleta reduzida: some o ruído do JPEG, combina com pixel art e deixa o PNG leve.
    return img.quantize(colors=cores, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")

def salvar(img, nome, cores=64):
    limpar(img, cores).save(f"{saida}/{nome}", optimize=True)

# Ícones comuns (o sistema arredonda os cantos; a arte vai de ponta a ponta).
for lado in (192, 512):
    salvar(reduzir(arte, lado), f"icone-{lado}.png")
salvar(reduzir(arte, 180), "apple-touch-icon.png")

# Maskable (Android): o O precisa caber no círculo central de 80%. A arte vai a 68% do lado,
# sobre o próprio fogo desfocado e escurecido, com as bordas fundidas para não aparecer um quadrado.
lado = 512
fundo = arte.resize((lado, lado), Image.LANCZOS).filter(ImageFilter.GaussianBlur(28))
fundo = ImageEnhance.Brightness(fundo).enhance(0.55)
miolo_lado = int(lado * 0.74)
miolo = arte.resize((miolo_lado, miolo_lado), Image.LANCZOS)
mascara = Image.new("L", (miolo_lado, miolo_lado), 0)
ImageDraw.Draw(mascara).rounded_rectangle((10, 10, miolo_lado - 10, miolo_lado - 10), radius=40, fill=255)
mascara = mascara.filter(ImageFilter.GaussianBlur(8))
pos = ((lado - miolo_lado) // 2,) * 2
fundo.paste(miolo, pos, mascara)
salvar(fundo, "icone-mascaravel-512.png")

# Favicon: em 16 e 32 px a arte inteira vira borrão; aqui entra só o O com a base do fogo, mais contrastado.
o = Image.open(fonte).convert("RGB").crop((176, 112, 848, 784))
o = ImageEnhance.Contrast(o).enhance(1.35)
o = ImageEnhance.Brightness(o).enhance(1.1)
f32 = limpar(o.resize((32, 32), Image.LANCZOS), 32)
f32.save(f"{saida}/favicon-32.png", optimize=True)
f48 = limpar(o.resize((48, 48), Image.LANCZOS), 48)
f48.save(f"{saida}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], append_images=[f32])

# Folha de prévia: tamanhos reais, ampliados e com as máscaras de Android (círculo, squircle) e iOS.
def mascarar(img, forma):
    l = img.size[0]
    m = Image.new("L", (l, l), 0)
    d = ImageDraw.Draw(m)
    if forma == "circulo":
        d.ellipse((0, 0, l - 1, l - 1), fill=255)
    else:
        d.rounded_rectangle((0, 0, l - 1, l - 1), radius=int(l * 0.22), fill=255)
    fundo_claro = Image.new("RGB", (l, l), (40, 40, 40))
    fundo_claro.paste(img, (0, 0), m)
    return fundo_claro

folha = Image.new("RGB", (1180, 560), (24, 24, 24))
d = ImageDraw.Draw(folha)
x = 20
i512 = Image.open(f"{saida}/icone-512.png").convert("RGB")
mk = Image.open(f"{saida}/icone-mascaravel-512.png").convert("RGB")
for rotulo, img in [("comum, iOS", mascarar(i512.resize((240, 240), Image.LANCZOS), "ios")),
                    ("maskable, círculo", mascarar(mk.resize((240, 240), Image.LANCZOS), "circulo")),
                    ("maskable, squircle", mascarar(mk.resize((240, 240), Image.LANCZOS), "ios"))]:
    folha.paste(img, (x, 40)); d.text((x, 290), rotulo, fill=(220, 220, 220)); x += 270
# zona segura de 80% no maskable
z = mk.resize((240, 240), Image.LANCZOS); dz = ImageDraw.Draw(z); dz.ellipse((24, 24, 216, 216), outline=(57, 255, 20), width=2)
folha.paste(z, (x, 40)); d.text((x, 290), "zona segura 80%", fill=(220, 220, 220))
# tamanhos reais e favicon ampliado
y = 330
for rotulo, caminho, lado in [("192 real", "icone-192.png", 96), ("48 real (tela inicial)", "icone-192.png", 48),
                              ("favicon 32 real", "favicon-32.png", 32), ("favicon 32 x6", "favicon-32.png", 192)]:
    img = Image.open(f"{saida}/{caminho}").convert("RGB")
    img = img.resize((lado, lado), Image.NEAREST if "x6" in rotulo else Image.LANCZOS)
    folha.paste(img, (20 + [0, 140, 260, 380][["192 real", "48 real (tela inicial)", "favicon 32 real", "favicon 32 x6"].index(rotulo)], y))
    d.text((20 + [0, 140, 260, 380][["192 real", "48 real (tela inicial)", "favicon 32 real", "favicon 32 x6"].index(rotulo)], y + 200), rotulo, fill=(220, 220, 220))
folha.save(previa)
