import { RepoSubmitHero } from "@/components/landing/RepoSubmitHero";
import { PostGrid } from "@/components/grid/PostGrid";

export default function HomePage() {
  return (
    <main>
      <RepoSubmitHero />
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-semibold">Discover</h2>
          <p className="text-sm text-muted-foreground">Latest shared projects</p>
        </div>
        <PostGrid />
      </section>
    </main>
  );
}
