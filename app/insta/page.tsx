import Header from "@/components/header";
import CaptionMaker from "@/components/insta/caption-maker";

export default function InstaPage() {
  return (
    <div className="flex h-full flex-col">
      <Header title="인스타 캡션 메이커" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <CaptionMaker />
      </div>
    </div>
  );
}
