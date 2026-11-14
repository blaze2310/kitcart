export async function flyCartIcon(source: SVGElement | null, target: HTMLElement | null) {
  if (!source || !source.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const from = source.getBoundingClientRect();
  const to = target?.getBoundingClientRect();
  const targetVisible = to && to.width > 0 && to.top >= 0 && to.bottom <= innerHeight;
  const dx = (targetVisible ? to.left + to.width / 2 : document.documentElement.clientWidth - 32) - (from.left + from.width / 2);
  const dy = (targetVisible ? to.top + to.height / 2 : 30) - (from.top + from.height / 2);
  const copy = source.cloneNode(true) as SVGElement;
  Object.assign(copy.style, {
    position: "fixed", left: `${from.left}px`, top: `${from.top}px`,
    width: `${from.width}px`, height: `${from.height}px`, zIndex: "2147483647",
    pointerEvents: "none", color: "#a4edf0", filter: "drop-shadow(0 0 6px #267b91)",
  });
  document.body.append(copy);
  try {
    await copy.animate([
      { transform: "translate(0, 0) scale(1)", offset: 0 },
      { transform: `translate(${dx * .24}px, ${dy * .24 - 42}px) scale(1.55)`, offset: .33 },
      { transform: `translate(${dx}px, ${dy}px) scale(.9)`, opacity: .85, offset: 1 },
    ], { duration: 440, easing: "cubic-bezier(.25,.58,.35,1)" }).finished;
  } catch {
    // Opening the cart does not depend on the animation finishing.
  } finally {
    copy.remove();
  }
}
