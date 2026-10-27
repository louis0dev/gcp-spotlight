/** 어두운 배경색이면 그 위 글자는 흰색이어야 읽힌다. "#rrggbb" */
export function isDarkColor(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}
