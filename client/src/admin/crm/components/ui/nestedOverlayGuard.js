const openIds = new Set();

export function registerNestedOverlay(id) {
  openIds.add(id);
  return () => openIds.delete(id);
}

export function hasOpenNestedOverlay() {
  return openIds.size > 0;
}
