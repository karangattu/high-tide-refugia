from PIL import Image

margin = 4
spacing = 4
cols = 7
rows = 2
fw = 382
fh = 387

img = Image.open('assets/sprites/cat_clipped.png').convert('RGBA')

new_w = margin*2 + cols*fw + (cols-1)*spacing
new_h = margin*2 + rows*fh + (rows-1)*spacing

new_img = Image.new('RGBA', (new_w, new_h), (0, 0, 0, 0))

for r in range(rows):
    for c in range(cols):
        left = c * fw
        top = r * fh
        box = (left, top, left+fw, top+fh)
        frame = img.crop(box)
        
        new_left = margin + c*(fw + spacing)
        new_top = margin + r*(fh + spacing)
        new_img.paste(frame, (new_left, new_top))

new_img.save('assets/sprites/cat_padded.png')
print("Saved cat_padded.png")
