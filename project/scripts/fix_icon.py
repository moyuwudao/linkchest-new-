from PIL import Image
from collections import deque

img = Image.open('apps/mobile/assets/icon.png').convert('RGBA')
w, h = img.size
pixels = img.load()

# Step 1: BFS from edges to mark background
visited = set()
q = deque()

for x in range(w):
    for y in [0, h-1]:
        r, g, b, a = pixels[x, y]
        if r > 180 and g > 180 and b > 180:
            visited.add((x, y))
            q.append((x, y))
for y in range(h):
    for x in [0, w-1]:
        r, g, b, a = pixels[x, y]
        if r > 180 and g > 180 and b > 180:
            if (x, y) not in visited:
                visited.add((x, y))
                q.append((x, y))

while q:
    x, y = q.popleft()
    for dx, dy in [(-1,0),(1,0),(0,-1),(0,1)]:
        nx, ny = x + dx, y + dy
        if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
            r, g, b, a = pixels[nx, ny]
            if r > 180 and g > 180 and b > 180:
                visited.add((nx, ny))
                q.append((nx, ny))

print(f'Background pixels: {len(visited)}')

# Step 2: Build list of non-background pixels with their colors
non_bg = []
for y in range(h):
    for x in range(w):
        if (x, y) not in visited:
            non_bg.append((x, y, pixels[x, y]))

print(f'Non-background pixels: {len(non_bg)}')

# Step 3: Multi-pass layer-by-layer fill
# Each pass only fills background pixels that have at least one non-background neighbor
changed = True
passes = 0
max_passes = 200

while changed and passes < max_passes:
    changed = False
    passes += 1
    to_remove = []
    
    # Check only background pixels at the boundary (those with non-bg neighbors)
    for (x, y) in list(visited):
        found = None
        best_dist = 999999
        for dy in range(-3, 4):
            for dx in range(-3, 4):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                    dist = dx*dx + dy*dy
                    if dist < best_dist:
                        best_dist = dist
                        found = pixels[nx, ny]
        if found:
            pixels[x, y] = found
            to_remove.append((x, y))
            changed = True
    
    for p in to_remove:
        visited.remove(p)
    
    if passes % 10 == 0:
        print(f'  Pass {passes}, remaining bg: {len(visited)}')

print(f'Completed after {passes} passes, remaining bg: {len(visited)}')

# Step 4: If any background remains, fill with a safe fallback
if visited:
    # Use the most common non-background color near edges
    edge_colors = {}
    for (x, y) in list(visited)[:1000]:
        for dy in range(-5, 6):
            for dx in range(-5, 6):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                    c = pixels[nx, ny][:3]
                    edge_colors[c] = edge_colors.get(c, 0) + 1
    if edge_colors:
        fallback = max(edge_colors.items(), key=lambda x: x[1])[0] + (255,)
        for (x, y) in visited:
            pixels[x, y] = fallback
        print(f'Fallback fill with {fallback}')

# Step 5: Verify
white_count = sum(1 for y in range(h) for x in range(w) 
                  if pixels[x, y][0] > 200 and pixels[x, y][1] > 200 and pixels[x, y][2] > 200)
print(f'Remaining white pixels: {white_count}')

img.save('apps/mobile/assets/adaptive-icon.png')
print('Saved adaptive-icon.png')
