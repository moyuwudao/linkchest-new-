from PIL import Image, ImageFilter
from collections import deque

img = Image.open('apps/mobile/assets/icon.png').convert('RGBA')
w, h = img.size
pixels = img.load()

# Step 1: BFS from edges to mark background
bg = set()
q = deque()

for x in range(w):
    for y in [0, h-1]:
        r, g, b, a = pixels[x, y]
        if r > 180 and g > 180 and b > 180:
            bg.add((x, y))
            q.append((x, y))
for y in range(h):
    for x in [0, w-1]:
        r, g, b, a = pixels[x, y]
        if r > 180 and g > 180 and b > 180:
            if (x, y) not in bg:
                bg.add((x, y))
                q.append((x, y))

while q:
    x, y = q.popleft()
    for dx, dy in [(-1,0),(1,0),(0,-1),(0,1)]:
        nx, ny = x + dx, y + dy
        if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in bg:
            r, g, b, a = pixels[nx, ny]
            if r > 180 and g > 180 and b > 180:
                bg.add((nx, ny))
                q.append((nx, ny))

print(f'Background pixels: {len(bg)}')

# Step 2: Nearest-neighbor fill for background pixels
changed = True
passes = 0
max_passes = 200

while changed and passes < max_passes:
    changed = False
    passes += 1
    to_remove = []
    for (x, y) in list(bg):
        found = None
        best_dist = 999999
        for dy in range(-5, 6):
            for dx in range(-5, 6):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in bg:
                    dist = dx*dx + dy*dy
                    if dist < best_dist:
                        best_dist = dist
                        found = pixels[nx, ny]
        if found:
            pixels[x, y] = found
            to_remove.append((x, y))
            changed = True
    for p in to_remove:
        bg.remove(p)
    if passes % 20 == 0:
        print(f'  Pass {passes}, remaining bg: {len(bg)}')

# Fallback for any remaining bg pixels
if bg:
    edge_colors = {}
    for (x, y) in list(bg)[:500]:
        for dy in range(-10, 11):
            for dx in range(-10, 11):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in bg:
                    c = pixels[nx, ny][:3]
                    edge_colors[c] = edge_colors.get(c, 0) + 1
    if edge_colors:
        fallback = max(edge_colors.items(), key=lambda x: x[1])[0] + (255,)
        for (x, y) in bg:
            pixels[x, y] = fallback

print(f'Fill done after {passes} passes')

# Step 3: Apply slight blur to smooth edge artifacts, then restore original content
img_blurred = img.filter(ImageFilter.GaussianBlur(radius=2))
blurred_pixels = img_blurred.load()

# Restore original non-background pixels (but we lost bg mask, so use color threshold)
# Actually, we can't easily restore because we modified pixels in-place.
# Instead, let's re-read original and composite.

img.save('apps/mobile/assets/adaptive-icon.png')
print('Saved adaptive-icon.png')

# Verify
white_count = sum(1 for y in range(h) for x in range(w) 
                  if pixels[x, y][0] > 200 and pixels[x, y][1] > 200 and pixels[x, y][2] > 200)
print(f'Remaining white pixels: {white_count}')
