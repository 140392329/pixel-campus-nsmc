import os, glob
from PIL import Image
src = r"refs/raw"
dst = r"refs/thumbs"
os.makedirs(dst, exist_ok=True)
for f in sorted(glob.glob(os.path.join(src, "*.jpg"))):
    name = os.path.splitext(os.path.basename(f))[0][:12]
    try:
        im = Image.open(f)
        w, h = im.size
        im = im.convert("RGB")
        im.thumbnail((900, 900))
        out = os.path.join(dst, name + ".jpg")
        im.save(out, quality=82)
        print(f"{name} orig={w}x{h} -> {im.size} {os.path.getsize(out)}B")
    except Exception as e:
        print("FAIL", f, e)
