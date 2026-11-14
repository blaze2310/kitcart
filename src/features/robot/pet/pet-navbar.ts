import type { Point } from "./hero-pet-motion";

// An upper-right exclusion zone expanded by the pet's on-screen reach.
export type NavbarEdge = { left: number; below: number };

export function clearNavbar(next: Point, from: Point, edge: NavbarEdge | null): Point {
  if (!edge || next.x <= edge.left || next.y >= edge.below) return next;
  if (from.x <= edge.left) return { x: edge.left, y: next.y };
  if (from.y >= edge.below) return { x: next.x, y: edge.below };
  return next.x - edge.left < edge.below - next.y
    ? { x: edge.left, y: next.y }
    : { x: next.x, y: edge.below };
}

export function aroundNavbar(from: Point, to: Point, edge: NavbarEdge | null): Point {
  if (!edge) return to;
  if ((from.x <= edge.left && to.x <= edge.left) || (from.y >= edge.below && to.y >= edge.below)) return to;
  return { x: edge.left, y: edge.below };
}

// A pointer can jump across the bar between events, even with two clear endpoints.
export function sweepNavbar(from: Point, wanted: Point, edge: NavbarEdge | null): Point {
  if (!edge) return wanted;
  const to = clearNavbar(wanted, from, edge);
  const corner = aroundNavbar(from, to, edge);
  if (corner === to) return to;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (from.x <= edge.left && dx > 0) {
    const y = from.y + dy * ((edge.left - from.x) / dx);
    return y >= edge.below ? to : { x: edge.left, y: to.y };
  }
  if (from.y >= edge.below && dy < 0) {
    const x = from.x + dx * ((edge.below - from.y) / dy);
    return x <= edge.left ? to : { x: to.x, y: edge.below };
  }
  return to;
}
