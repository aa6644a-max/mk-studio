/** 제목 기반 결정적 포스터 컬러 (이미지 없을 때 플레이스홀더). */
export function posterColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) % 360;
  }
  return `hsl(${h}, 42%, 38%)`;
}
