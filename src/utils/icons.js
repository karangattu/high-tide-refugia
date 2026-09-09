import {
    Trophy,
    Heart,
    HeartCrack,
    Leaf,
    Flame,
    Waves,
    PawPrint,
    Zap,
    Crosshair,
    Star,
    Maximize2,
    Sprout,
    TriangleAlert,
    ExternalLink,
} from 'lucide';

export const ICON_DEFINITIONS = {
    icon_trophy: { nodes: Trophy, size: 32, color: '#f1c40f', fill: 'rgba(241, 196, 15, 0.2)', strokeWidth: 2 },
    icon_heart_green: { nodes: Heart, size: 32, color: '#2ecc71', fill: '#27ae60', strokeWidth: 2 },
    icon_heart_broken: { nodes: HeartCrack, size: 32, color: '#e74c3c', fill: 'rgba(231, 76, 60, 0.2)', strokeWidth: 2 },
    icon_leaf: { nodes: Leaf, size: 32, color: '#2ecc71', fill: 'rgba(46, 204, 113, 0.25)', strokeWidth: 2 },
    icon_sprout: { nodes: Sprout, size: 32, color: '#27ae60', fill: 'rgba(39, 174, 96, 0.2)', strokeWidth: 2 },
    icon_flame: { nodes: Flame, size: 32, color: '#e67e22', fill: 'rgba(230, 126, 34, 0.25)', strokeWidth: 2 },
    icon_wave: { nodes: Waves, size: 32, color: '#3498db', fill: 'none', strokeWidth: 2.2 },
    icon_paw: { nodes: PawPrint, size: 32, color: '#f39c12', fill: 'rgba(243, 156, 18, 0.25)', strokeWidth: 2 },
    icon_bolt: { nodes: Zap, size: 32, color: '#f1c40f', fill: '#f1c40f', strokeWidth: 2 },
    icon_target: { nodes: Crosshair, size: 32, color: '#e74c3c', fill: 'none', strokeWidth: 2 },
    icon_star: { nodes: Star, size: 32, color: '#f1c40f', fill: '#f1c40f', strokeWidth: 2 },
    icon_maximize: { nodes: Maximize2, size: 32, color: '#ffffff', fill: 'none', strokeWidth: 2.2 },
    icon_alert: { nodes: TriangleAlert, size: 36, color: '#ff6b6b', fill: 'rgba(255, 107, 107, 0.2)', strokeWidth: 2.2 },
    icon_external_link: { nodes: ExternalLink, size: 32, color: '#ffffff', fill: 'none', strokeWidth: 2 },
};

export function drawLucideIcon(ctx, iconNodes, options = {}) {
    const {
        size = 32,
        color = '#ffffff',
        fill = 'none',
        strokeWidth = 2,
    } = options;

    const pad = 3;
    const targetDim = size - pad * 2;
    const scale = targetDim / 24;

    ctx.save();
    ctx.translate(pad, pad);
    ctx.scale(scale, scale);

    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;

    for (let i = 0; i < iconNodes.length; i++) {
        const [tag, attrs] = iconNodes[i];
        if (tag === 'path') {
            const p = new Path2D(attrs.d);
            if (fill && fill !== 'none') {
                ctx.fillStyle = fill;
                ctx.fill(p);
            }
            if (color && color !== 'none') {
                ctx.stroke(p);
            }
        } else if (tag === 'circle') {
            const cx = parseFloat(attrs.cx);
            const cy = parseFloat(attrs.cy);
            const r = parseFloat(attrs.r);
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            if (fill && fill !== 'none') {
                ctx.fillStyle = fill;
                ctx.fill();
            }
            if (color && color !== 'none') {
                ctx.stroke();
            }
        } else if (tag === 'line') {
            const x1 = parseFloat(attrs.x1);
            const y1 = parseFloat(attrs.y1);
            const x2 = parseFloat(attrs.x2);
            const y2 = parseFloat(attrs.y2);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        } else if (tag === 'rect') {
            const rx = parseFloat(attrs.x || 0);
            const ry = parseFloat(attrs.y || 0);
            const rw = parseFloat(attrs.width);
            const rh = parseFloat(attrs.height);
            const radius = parseFloat(attrs.rx || 0);
            ctx.beginPath();
            if (radius && typeof ctx.roundRect === 'function') {
                ctx.roundRect(rx, ry, rw, rh, radius);
            } else {
                ctx.rect(rx, ry, rw, rh);
            }
            if (fill && fill !== 'none') {
                ctx.fillStyle = fill;
                ctx.fill();
            }
            if (color && color !== 'none') {
                ctx.stroke();
            }
        } else if (tag === 'polygon' || tag === 'polyline') {
            const pts = attrs.points.trim().split(/[\s,]+/).map(Number);
            if (pts.length >= 2) {
                ctx.beginPath();
                ctx.moveTo(pts[0], pts[1]);
                for (let j = 2; j < pts.length; j += 2) {
                    ctx.lineTo(pts[j], pts[j + 1]);
                }
                if (tag === 'polygon') ctx.closePath();
                if (fill && fill !== 'none') {
                    ctx.fillStyle = fill;
                    ctx.fill();
                }
                if (color && color !== 'none') {
                    ctx.stroke();
                }
            }
        }
    }

    ctx.restore();
}

export function registerLucideIconTextures(scene) {
    if (!scene || !scene.textures || typeof scene.textures.createCanvas !== 'function') {
        return;
    }
    if (typeof Path2D === 'undefined') {
        return;
    }

    for (const [key, def] of Object.entries(ICON_DEFINITIONS)) {
        if (scene.textures.exists(key)) {
            scene.textures.remove(key);
        }
        const tex = scene.textures.createCanvas(key, def.size, def.size);
        if (!tex) continue;
        const ctx = tex.getContext();
        if (!ctx) continue;
        drawLucideIcon(ctx, def.nodes, def);
        tex.refresh();
    }
}
