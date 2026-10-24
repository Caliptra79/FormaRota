"""Build the Windows icon from the existing, selected FormaRota PWA icon."""
from pathlib import Path
from PIL import Image

base=Path(__file__).resolve().parents[1]
source=base/"icon-512.png"
destination=base/"desktop"/"formarota.ico"
with Image.open(source) as image:
    image.convert("RGBA").save(destination,format="ICO",sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
assert destination.stat().st_size>1000
print("Windows icon:",destination.name,destination.stat().st_size,"bytes")
