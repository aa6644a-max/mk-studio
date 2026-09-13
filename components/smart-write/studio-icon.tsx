import type { CSSProperties } from "react";

export type StudioIconName = "spark" | "pen" | "search" | "plan" | "check" | "arrow" | "back" | "file" | "photo" | "link" | "upload" | "close" | "pause" | "play" | "copy" | "download" | "eye" | "code" | "edit" | "shield" | "clock" | "plus";
const paths: Record<StudioIconName, React.ReactNode> = {
  spark: <><path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6Z" /><path d="m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5Z" /></>,
  pen: <><path d="m16 3 5 5-12 12-6 1 1-6Z" /><path d="m13 6 5 5M4 15l5 5" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5M8 8h5M8 11h3" /></>,
  plan: <><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 8h8M8 12h5M8 16h7" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  back: <path d="M20 12H4m6-6-6 6 6 6" />,
  file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></>,
  photo: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 4-6 5 7" /></>,
  link: <><path d="m10 13 4-4M9 15l-2 2a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0M15 9l2-2a3.5 3.5 0 0 1 5 5l-4 4a3.5 3.5 0 0 1-5 0" transform="translate(-1 -1)" /></>,
  upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  pause: <><path d="M8 5v14M16 5v14" strokeWidth="3" /></>,
  play: <path d="m8 4 12 8-12 8Z" />,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4" /></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  code: <path d="m7 7-5 5 5 5m10-10 5 5-5 5M14 4l-4 16" />,
  edit: <><path d="m14 5 5 5M12 20h9M4 16l-1 5 5-1L21 7l-5-5Z" /></>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" /><path d="m8 12 3 3 5-6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
};
export default function StudioIcon({ name, size = 20, className, style }: { name: StudioIconName; size?: number; className?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>{paths[name]}</svg>;
}
