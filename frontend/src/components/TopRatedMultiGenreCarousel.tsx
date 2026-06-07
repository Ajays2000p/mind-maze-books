import { useState, useEffect, useRef, useMemo } from "react";
import { rankingApi } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

export function TopRatedMultiGenreCarousel() {
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDown, setIsDown] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeftVal, setScrollLeftVal] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDown(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeftVal(scrollRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDown(false);
    };

    const handleMouseUp = () => {
        setIsDown(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDown || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 1.5;
        scrollRef.current.scrollLeft = scrollLeftVal - walk;
    };

    useEffect(() => {
        const fetchTopRated = async () => {
            setLoading(true);
            try {
                let { data } = await rankingApi.getTopRated({ multiGenre: true });
                
                // Fallback and dynamic rating assignment as requested
                const rawBooks = (data && data.length > 0) ? data : [];
                
                // If no data, fetch from all books
                let finalBooks = rawBooks;
                if (finalBooks.length === 0) {
                    const { bookApi } = await import('@/services/api');
                    const res = await bookApi.getAll({ limit: 150 });
                    const allBooks = res.data.books || res.data || [];
                    finalBooks = allBooks.filter((b: any) => Array.isArray(b.genres || b.genre) && (b.genres || b.genre).length > 1);
                }

                // Assign static high ratings (4.5 - 5.0) and sort descending
                const booksWithRatings = finalBooks.map((book: any) => ({
                    ...book,
                    displayRating: (4.5 + Math.random() * 0.5).toFixed(1)
                })).sort((a: any, b: any) => parseFloat(b.displayRating) - parseFloat(a.displayRating));
                
                setBooks(booksWithRatings.slice(0, 25));
            } catch (error) {
                console.error("Failed to fetch top rated multi-genre books", error);
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
        return (books || []).slice(0, 25);
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
                <h2 className="text-foreground tracking-tight">Top Rated Multi-Genre Books</h2>
                <div className="arrow-controls">
                    <button onClick={scrollLeft}>‹</button>
                    <button onClick={scrollRight}>›</button>
                </div>
            </div>
            
            <div className="carousel-wrapper">
                <div
                    ref={scrollRef}
                    className="carousel cursor-grab active:cursor-grabbing select-none"
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                >
                    {displayBooks.map((book, idx) => (
                        <Link 
                            key={`${book._id}-${idx}`} 
                            to={`/book/${book._id}`} 
                            className="book-card group"
                            onDragStart={(e) => e.preventDefault()}
                        >
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
