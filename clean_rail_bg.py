import math
from PIL import Image

def distance(c1, c2):
    return math.sqrt(sum((a - b)**2 for a, b in zip(c1[:3], c2[:3])))

img = Image.open('assets/sprites/rail_sprite_sheet.png').convert("RGBA")
datas = img.getdata()
newData = []
white = (255, 255, 255)

for item in datas:
    if distance(item, white) < 30: # tolerance to catch JPEG compression artifacts near white
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)

img.putdata(newData)
img.save('assets/sprites/rail_transparent.png', "PNG")
print("Saved rail_transparent.png")
