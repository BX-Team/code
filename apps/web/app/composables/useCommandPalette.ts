export const useCommandPaletteOpen = () => useState<boolean>('cmd-palette', () => false);

export function openCommandPalette() {
  useCommandPaletteOpen().value = true;
}

export function closeCommandPalette() {
  useCommandPaletteOpen().value = false;
}

export function toggleCommandPalette() {
  const state = useCommandPaletteOpen();
  state.value = !state.value;
}
