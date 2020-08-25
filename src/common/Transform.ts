export type vec2 = { x: number, y: number };
export type rect = { left: number, right: number, top: number, bottom: number };

export type line = { start: vec2, end: vec2 };

export class Line {
    public static Intersect(a: line, b: line): boolean {
        return Line.IntersectMathCheck(...Line.IntersectMath(a, b));
    }

    public static IntersectPoint(a: line, b: line): vec2 | null {
        const [uA, uB] = Line.IntersectMath(a, b);

        if (Line.IntersectMathCheck(uA, uB)) {
            return {
                x: a.start.x + (uA * (a.end.x - a.start.x)),
                y: a.start.y + (uB * (a.end.y - a.start.y)),
            };
        }

        return null;
    }

    private static IntersectMath(a: line, b: line): [number, number] {
        const x1 = a.start.x;
        const y1 = a.start.y;
        const x2 = a.end.x;
        const y2 = a.end.y;

        const x3 = b.start.x;
        const y3 = b.start.y;
        const x4 = b.end.x;
        const y4 = b.end.y;

        return [
            ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1)),
            ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1))
        ];
    }

    private static IntersectMathCheck(a: number, b: number): boolean {
        return a >= 0 && a <= 1 && b >= 0 && b <= 1
    }

    public static IntersectRect(line: line, rect: rect): boolean {
        const lines = Rect.To4Lines(rect);
        for (const l of lines) {
            if (Line.Intersect(line, l)) return true;
        }
        return false;
    }

    public static IntersectRectPoints(line: line, rect: rect): vec2[] {
        const lines = Rect.To4Lines(rect);
        return lines.map(l => Line.IntersectPoint(line, l)).filter((i): i is vec2 => i != null);
    }
}

export class Vec2 {

    public static MagnitudeSquared(vec: vec2): number {
        return (vec.x * vec.x) + (vec.y * vec.y);
    }

    public static Magnitude(vec: vec2): number {
        return Math.sqrt(Vec2.MagnitudeSquared(vec));
    }

    public static Swap(vec: vec2): vec2 {
        return {
            x: vec.y,
            y: vec.x,
        };
    }
    public static Sum(a: vec2, b: vec2): vec2 {
        return { x: a.x + b.x, y: a.y + b.y };
    }

    public static Multiply(vec: vec2, by: number): vec2 {
        return { x: vec.x * by, y: vec.y * by };
    }

    public static DistanceSquared(a: vec2, b: vec2): number {
        const x = a.x - b.x;
        const y = a.y - b.y;
        return (x * x) + (y * y);
    }

    public static Distance(a: vec2, b: vec2): number {
        return Math.sqrt(Vec2.DistanceSquared(a, b));
    }

    public static Clamp(vec: vec2, min: number, max: number): vec2 {
        return {
            x: Math.min(Math.max(vec.x, min), max),
            y: Math.min(Math.max(vec.y, min), max),
        }
    }
    public static ClampVec(vec: vec2, min: vec2, max: vec2): vec2 {
        return {
            x: Math.min(Math.max(vec.x, min.x), max.x),
            y: Math.min(Math.max(vec.y, min.y), max.y),
        }
    }

    public static Equal(a: vec2, b: vec2): boolean {
        return a.x == b.x && a.y == b.y;
    }
}

export class Rect {

    public static FromVec2(vec: vec2): rect {
        return { top: vec.y, bottom: vec.y, left: vec.x, right: vec.x };
    }

    public static FromPosAndSize(pos: vec2, size: vec2): rect {
        return Rect.FromTLAndBR(pos, Vec2.Sum(pos, size));
    }

    public static FromPosAndPad(pos: vec2, pad: number) {
        return Rect.Pad(Rect.FromVec2(pos), pad);
    }

    public static FromTLAndBR(tl: vec2, br: vec2): rect {

        return {
            top: tl.y,
            bottom: br.y,
            left: tl.x,
            right: br.x,
        };
    }

    public static Pad(rect: rect, pad: number): rect {
        return {
            top: rect.top - pad,
            bottom: rect.bottom + pad,
            left: rect.left - pad,
            right: rect.right + pad,
        };
    }

    public static Intersect(rectA: rect, rectB: rect): number {
        const x_overlap = Math.max(0, Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left));
        const y_overlap = Math.max(0, Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top));
        return x_overlap * y_overlap;
    }

    public static To4Lines(rect: rect): [line, line, line, line] {
        return [
            { start: { x: rect.left, y: rect.top }, end: { x: rect.right, y: rect.top } },
            { start: { x: rect.right, y: rect.top }, end: { x: rect.right, y: rect.bottom } },
            { start: { x: rect.right, y: rect.bottom }, end: { x: rect.left, y: rect.bottom } },
            { start: { x: rect.left, y: rect.bottom }, end: { x: rect.left, y: rect.top } },
        ]
    }
}