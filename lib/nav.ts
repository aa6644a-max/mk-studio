export type NavItem = {
  href: string;
  label: string;
  icon: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/write", label: "리뷰 작성", icon: "✏️" },
  { href: "/images", label: "이미지 작업실", icon: "🖼️" },
  { href: "/card-news", label: "영화 카드뉴스 메이커", icon: "🎬" },
  { href: "/marketing", label: "마케팅 전략", icon: "📣" },
  { href: "/partnerships/class101", label: "클래스101 파트너스", icon: "📦" },
];
