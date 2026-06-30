import Header from "@/components/header";
import MovieCardWorkflow from "@/components/card-news/movie-card-workflow";

export default function CardNewsPage() {
  return (
    <div className="flex h-full flex-col">
      <Header title="영화 카드뉴스 메이커" />
      <div className="min-h-0 flex-1">
        <MovieCardWorkflow />
      </div>
    </div>
  );
}
