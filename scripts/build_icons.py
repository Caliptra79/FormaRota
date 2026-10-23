#!/usr/bin/env python3
"""Render the vector icon into the fixed PWA/iOS sizes without changing app identity."""
from pathlib import Path
from io import BytesIO
import cairosvg
from PIL import Image

root = Path(__file__).resolve().parents[1]
svg = (root / "assets" / "formarota-icon.svg").read_bytes()
for size, name in ((192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")):
    data = cairosvg.svg2png(bytestring=svg, output_width=size, output_height=size)
    image = Image.open(BytesIO(data)).convert("RGB")
    image.quantize(colors=64, method=Image.Quantize.MEDIANCUT).save(root / name, optimize=True)
    check = Image.open(root / name)
    assert check.size == (size, size)
    print(f"Rendered {name} ({size}×{size})")
