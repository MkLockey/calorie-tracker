"""Generate PNG icons for 每日营养追踪"""
from PIL import Image, ImageDraw
import math, os

def rounded_rect(img, r, pad=0):
    """Apply rounded rect clip by masking"""
    w, h = img.size
    mask = Image.new('L', (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([pad, pad, w - pad, h - pad], r, fill=255)
    img.putalpha(mask)

def draw_icon(size, maskable=False, output_path=None):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background gradient
    pad = int(size * 0.11) if maskable else 0
    inner = size - pad * 2
    for y in range(pad, pad + inner):
        t = (y - pad) / inner
        r = int(26 + t * 10)
        g = int(26 + t * 30)
        b = int(46 + t * 30)
        draw.line([(pad, y), (pad + inner, y)], fill=(r, g, b))

    # Rounded corner mask
    r = int(size * 0.16)
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([pad, pad, size - pad, size - pad], r, fill=255)
    img.putalpha(mask)

    cx = size / 2
    cy = size * 0.40 if not maskable else size * 0.42
    s = size * 0.16

    # Outer arc ring (plate)
    arc_r = s * 1.55
    arc_bbox = (cx - arc_r, cy - arc_r, cx + arc_r, cy + arc_r)
    draw.arc(arc_bbox, 225, 315, fill=(255, 255, 255, 64), width=max(2, int(s * 0.14)))

    # Three colored segments
    colors = [(255, 107, 107), (249, 202, 36), (78, 205, 196)]
    seg_r = s * 1.42
    seg_w = max(2, int(s * 0.22))
    for i, (start_deg, end_deg) in enumerate([(218, 278), (280, 340), (342, 400)]):
        seg_bbox = (cx - seg_r, cy - seg_r, cx + seg_r, cy + seg_r)
        draw.arc(seg_bbox, start_deg, end_deg, fill=colors[i], width=seg_w)

    # Center circle
    dot_r = s * 0.30
    draw.ellipse((cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r), fill=(108, 92, 231))
    # Inner highlight
    hl_r = s * 0.10
    draw.ellipse((cx - s * 0.06 - hl_r, cy - s * 0.06 - hl_r, cx - s * 0.06 + hl_r, cy - s * 0.06 + hl_r), fill=(255, 255, 255, 77))

    # Leaf accent
    lx, ly = cx + s * 1.15, cy - s * 1.25
    leaf_w, leaf_h = s * 0.38, s * 0.20
    # Rotated ellipse via polygon approximation
    angle = math.radians(30)
    pts = []
    for a in range(0, 360, 10):
        ra = math.radians(a)
        ex = leaf_w * math.cos(ra)
        ey = leaf_h * math.sin(ra)
        rx = ex * math.cos(angle) - ey * math.sin(angle) + lx
        ry = ex * math.sin(angle) + ey * math.cos(angle) + ly
        pts.append((rx, ry))
    draw.polygon(pts, fill=(78, 205, 196, 204))
    # Leaf vein
    dx = leaf_w * math.cos(angle)
    dy = leaf_w * math.sin(angle)
    vx1, vy1 = lx - dx * 0.6, ly - dy * 0.6
    vx2, vy2 = lx + dx * 0.7, ly + dy * 0.7
    draw.line([(vx1, vy1), (vx2, vy2)], fill=(255, 255, 255, 51), width=max(1, int(s * 0.04)))

    # Composite onto solid background (no transparency for app icon)
    bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bg.paste(img, (0, 0), img)
    # Flatten to opaque
    final = Image.new('RGB', (size, size), (26, 26, 46))
    final.paste(bg, (0, 0), bg)
    final.save(output_path, 'PNG')
    print(f'  Saved: {output_path}')

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    icons_dir = 'icons'
    os.makedirs(icons_dir, exist_ok=True)
    print('Generating icons...')
    draw_icon(192, False, os.path.join(icons_dir, 'icon-192.png'))
    draw_icon(512, False, os.path.join(icons_dir, 'icon-512.png'))
    draw_icon(512, True, os.path.join(icons_dir, 'icon-512-maskable.png'))
    print('Done!')
