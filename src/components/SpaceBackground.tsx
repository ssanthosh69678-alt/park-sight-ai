/**
 * Animated space / universe backdrop.
 * Pure CSS layers (nebulae, parallax star fields, shooting stars) — no canvas, no JS loop.
 */
export function SpaceBackground() {
  return (
    <div aria-hidden className="space-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="space-nebula absolute inset-0" />
      <div className="space-stars space-stars-1 absolute inset-0" />
      <div className="space-stars space-stars-2 absolute inset-0" />
      <div className="space-stars space-stars-3 absolute inset-0" />
      <span className="space-shooting space-shooting-1" />
      <span className="space-shooting space-shooting-2" />
      <div className="space-vignette absolute inset-0" />
    </div>
  );
}
