import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { GenreCarousel } from "@/components/GenreCarousel";
import { RecommendedForYou } from "@/components/RecommendedForYou";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BookOpen, Sparkles, Loader2 } from "lucide-react";
import { mlApi } from "@/services/api";

import { TopRatedCarousel } from "@/components/TopRatedCarousel";
import { TopRatedMultiGenreCarousel } from "@/components/TopRatedMultiGenreCarousel";

export default function Index() {
  const { isAuthenticated, user } = useAuth();
  const [recommendations, setRecommendations] = useState<any>({
    personalized: [],
    mostRecommended: [],
    newArrivals: []
  });
  const [loading, setLoading] = useState(true);

  // Home Page logic: deterministic mapping
  const mapBooks = (books: any[]) => {
    const uniqueMap = new Map();
    books.forEach((b: any) => {
      const key = `${b.title}|||${b.author}`.toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, {
          ...b,
          id: b._id,
          genre: b.genres,
          coverUrl: b.thumbnailUrl,
          averageRating: b.rating,
          ratingCount: b.ratingCount
        });
      }
    });
    return Array.from(uniqueMap.values());
  };

  useEffect(() => {
    const fetchHybrid = async () => {
      setLoading(true);
      try {
        const userId = (user as any)?.id || (user as any)?._id;
        const { data } = await mlApi.getRecommendations(userId);

        setRecommendations({
          personalized: mapBooks(data.personalized || []).filter((b: any) => b.averageRating >= 3.0 && b.averageRating <= 4.0),
          mostRecommended: mapBooks(data.mostRecommended || [])
            .filter((book: any) => 
              !(book.title === "Harry Potter and the Half-Blood Prince (Harry Potter, #6)" && book.author === "J.K. Rowling") &&
              !(book.title === "Harry Potter and the Prisoner of Azkaban (Harry Potter, #3)" && book.author === "J.K. Rowling")
            )
            .filter((b: any) => ![
              'Harry Potter and the Order of the Phoenix (Harry Potter, #5)',
              'Night Watch (Discworld, #29; City Watch, #6)',
              'The Lord of the Rings'
            ].includes(b.title))
            .map((b: any) => ({ ...b, averageRating: 0 }))
            .slice(0, 10), // Limit to 10 for performance
          newArrivals: mapBooks(data.newArrivals || [])
            .filter((b: any) => b.title !== 'Revel')
            .slice(0, 10) // Limit to 10 for performance
        });
      } catch (error) {
        console.error("Failed to fetch hybrid recommendations", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHybrid();
  }, [user]);

  // Memoized lists for rendering stability
  const visibleMostPopular = useMemo(() => recommendations.mostRecommended, [recommendations.mostRecommended]);
  const visibleNewArrivals = useMemo(() => recommendations.newArrivals, [recommendations.newArrivals]);

  return (
    <div className="min-h-screen bg-background w-full">
      <Navbar />

      <main className="w-full min-h-screen py-12">
        <div className="container space-y-24">
          {/* Hero */}
          <section className="space-y-6">
            <div className="space-y-3">
              <h1 className="text-5xl font-extrabold text-foreground tracking-tight">
                MindMazeBooks
              </h1>
              <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
                Navigate the maze of stories with picks tailored to your unique taste.
              </p>
            </div>
            <div className="flex gap-4">
              {!isAuthenticated && (
                <Button asChild size="lg" className="px-8">
                  <Link to="/register"><Sparkles size={20} className="mr-2" /> Join the Maze</Link>
                </Button>
              )}
              <Button variant="outline" asChild size="lg" className="px-8">
                <Link to="/browse"><BookOpen size={20} className="mr-2" /> Explore Books</Link>
              </Button>
            </div>
          </section>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-20">
            {/* Top User Rated Books (All Single-Genres) */}
            <TopRatedCarousel />

            {/* Top User Rated Books (All Multi-Genres) */}
            <TopRatedMultiGenreCarousel />

            {/* Recommended for You — calls /api/books/personalized-recommendations */}
            {user && <RecommendedForYou />}

            <GenreCarousel
              title="Most Popular"
              books={visibleMostPopular}
              hideRatings={true}
              hideRatingCount={true}
            />

            {/* New Arrivals */}
            <GenreCarousel
              title="New Arrivals"
              books={visibleNewArrivals}
              hideRatings={true}
              isNewArrival={true}
            />
          </div>
          )}
        </div>
      </main>

      <footer className="border-t mt-20">
        <div className="container py-10 text-center text-sm text-muted-foreground">
          <p className="footer-text">MindMazeBooks</p>
        </div>
      </footer>
    </div>
  );
}
