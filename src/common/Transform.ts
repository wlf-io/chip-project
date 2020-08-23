export type Vec2 = { x: number, y: number };
export type Rect = { left: number, right: number, top: number, bottom: number };

export class Vector2 {
    public static Sum(a: Vec2, b: Vec2) {
        return { x: a.x + b.x, y: a.y + b.y };
    }

    public static Multiply(vec: Vec2, by: number) {
        return { x: vec.x * by, y: vec.y * by };
    }

    public static DistanceSquared(a: Vec2, b: Vec2) {
        const x = a.x - b.x;
        const y = a.y - b.y;
        return (x * x) + (y * y);
    }

    public static Distance(a: Vec2, b: Vec2): number {
        return Math.sqrt(Vector2.DistanceSquared(a, b));
    }

    public static Clamp(vec: Vec2, min: number, max: number) {
        return {
            x: Math.min(Math.max(vec.x, min), max),
            y: Math.min(Math.max(vec.y, min), max),
        }
    }
    public static ClampVec(vec: Vec2, min: Vec2, max: Vec2) {
        return {
            x: Math.min(Math.max(vec.x, min.x), max.x),
            y: Math.min(Math.max(vec.y, min.y), max.y),
        }
    }
}

export class Rectangle {

    public static FromVec2(vec: Vec2): Rect {
        return { top: vec.y, bottom: vec.y, left: vec.x, right: vec.x };
    }

    public static FromPosAndSize(pos: Vec2, size: Vec2): Rect {
        return Rectangle.FromTLAndBR(pos, Vector2.Sum(pos, size));
    }

    public static FromTLAndBR(tl: Vec2, br: Vec2): Rect {

        return {
            top: tl.y,
            bottom: br.y,
            left: tl.x,
            right: br.x,
        };
    }

    public static Pad(rect: Rect, pad: number): Rect {
        return {
            top: rect.top - pad,
            bottom: rect.bottom + pad,
            left: rect.left - pad,
            right: rect.right + pad,
        };
    }

    public static Intersect(rectA: Rect, rectB: Rect) {
        const x_overlap = Math.max(0, Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left));
        const y_overlap = Math.max(0, Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top));
        return x_overlap * y_overlap;
    }
}