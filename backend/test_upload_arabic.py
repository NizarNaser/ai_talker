import requests
from PIL import Image, ImageFont, ImageDraw

img = Image.new('RGB', (100, 30), color = (73, 109, 137))
d = ImageDraw.Draw(img)
# just drawing some pixels that might be interpreted as text, or we can just download an arabic image
