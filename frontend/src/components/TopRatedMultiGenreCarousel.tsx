import { useState, useEffect, useRef, useMemo } from "react";
import { rankingApi } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { SkeletonCarousel } from "@/components/SkeletonCarousel";

export function TopRatedMultiGenreCarousel() {
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchTopRated = async () => {
            setLoading(true);
            try {
                let { data } = await rankingApi.getTopRated({ multiGenre: true, limit: 10 });
                
                const rawBooks = Array.isArray(data) ? data : (data?.books || []);
                
                // Format ratings from MongoDB data while preserving backend sort order
                const booksWithRatings = rawBooks.map((book: any) => {
                    const val = book.averageRating !== undefined ? book.averageRating : (book.rating || 0);
                    return {
                        ...book,
                        displayRating: Number(val).toFixed(1)
                    };
                });
                
                setBooks(booksWithRatings.slice(0, 10));
            } catch (error) {
                console.error("Failed to fetch top rated multi-genre books", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTopRated();

        const handleRatingUpdate = () => {
            fetchTopRated();
        };
        window.addEventListener("ratingUpdated", handleRatingUpdate);
        return () => {
            window.removeEventListener("ratingUpdated", handleRatingUpdate);
        };
    }, []);

    const scrollLeft = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft -= 300;
        }
    };

    const scrollRight = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft += 300;
        }
    };

    const displayBooks = useMemo(() => {
        return (books || []).slice(0, 10);
    }, [books]);

    if (loading) {
        return <SkeletonCarousel title="Top Rated Multi-Genre Books" />;
    }

    return (
        <section className="space-y-6">
            <div className="section-header">
                <h2 className="text-foreground tracking-tight">Top Rated Multi-Genre Books</h2>
                <div className="arrow-controls">
                    <button onClick={scrollLeft}>‹</button>
                    <button onClick={scrollRight}>›</button>
                </div>
            </div>
            
            <div className="carousel-wrapper">
                <div
                    ref={scrollRef}
                    className="carousel"
                >
                    {displayBooks.map((book, idx) => (
                        <Link key={`${book._id}-${idx}`} to={`/book/${book._id}`} className="book-card group">
                            <Card className="overflow-hidden border bg-card hover:shadow-xl transition-all duration-300 relative h-full">
                                <div className="overflow-hidden">
                                    <img
                                        src={book.realCoverImage || book.thumbnailUrl}
                                        alt={book.title}
                                        className="transition-transform duration-500 group-hover:scale-110"
                                        loading="lazy"
                                    />
                                </div>
                                <CardContent className="p-3.5 flex flex-col justify-between flex-grow">
                                    <div className="space-y-1">
                                        <h3 className="book-title group-hover:text-primary transition-colors">
                                            {book.title}
                                        </h3>
                                        <p className="book-author" title={book.author}>
                                            {book.author}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                        <span className="font-medium text-foreground">{book.displayRating || "0.0"}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
