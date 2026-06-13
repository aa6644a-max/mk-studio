export type NavItem = {
  href: string;
  label: string;
  icon: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/write", label: "리뷰 작성", icon: "✏️" },
  { href: "/history", label: "히스토리", icon: "🕐" },
  { href: "/images", label: "이미지 작업실", icon: "🖼️" },
];
