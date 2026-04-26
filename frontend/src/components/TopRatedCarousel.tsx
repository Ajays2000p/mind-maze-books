import { useState, useEffect, useRef, useMemo } from "react";
import { rankingApi } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { genres } from "@/lib/mock-data";

export function TopRatedCarousel() {
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchTopRated = async () => {
            setLoading(true);
            try {
                let { data } = await rankingApi.getTopRated({});
                
                // Fallback and dynamic rating assignment as requested
                const rawBooks = (data && data.length > 0) ? data : [];
                
                // If no data, fetch from all books
                let finalBooks = rawBooks;
                if (finalBooks.length === 0) {
                    const { bookApi } = await import('@/services/api');
                    const res = await bookApi.getAll({ limit: 50 });
                    const allBooks = res.data.books || res.data || [];
                    finalBooks = allBooks.filter((b: any) => !Array.isArray(b.genres || b.genre) || (b.genres || b.genre).length <= 1);
                }

                // Assign static high ratings (4.5 - 5.0)
                const booksWithRatings = finalBooks.map((book: any) => ({
                    ...book,
                    displayRating: (4.5 + Math.random() * 0.5).toFixed(1)
                }));
                
                setBooks(booksWithRatings.slice(0, 10));
            } catch (error) {
                console.error("Failed to fetch top rated books", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTopRated();
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
        return (
            <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <section className="space-y-6">
            <div className="section-header">
                <h2 className="text-foreground tracking-tight">Top Rated Single-Genre Books</h2>
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
                                        src={book.thumbnailUrl}
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
                                    <div className="flex items-center gap-2 mt-1">
                                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                        <span className="text-xs font-medium">{book.displayRating || "0.0"}</span>
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
