import { useState, useEffect, useRef, useMemo } from "react";
import { rankingApi } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import { SkeletonCarousel } from "@/components/SkeletonCarousel";

export function TopRatedCarousel() {
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Mouse drag states
    const [isDown, setIsDown] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeftVal, setScrollLeftVal] = useState(0);

    // Mouse drag handlers
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
                const { data } = await rankingApi.getTopRated({ limit: 10 });

                const rawBooks = Array.isArray(data)
                    ? data
                    : (data?.books || []);

                // Format ratings while preserving backend order
                const booksWithRatings = rawBooks.map((book: any) => {
                    const val =
                        book.averageRating !== undefined
                            ? book.averageRating
                            : (book.rating || 0);

                    return {
                        ...book,
                        displayRating: Number(val).toFixed(1),
                    };
                });

                setBooks(booksWithRatings.slice(0, 10));
            } catch (error) {
                console.error("Failed to fetch top rated books", error);
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
            window.removeEventListener(
                "ratingUpdated",
                handleRatingUpdate
            );
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
        return (books || []).slice(0, 25);
    }, [books]);

    if (loading) {
        return <SkeletonCarousel title="Top Rated Single-Genre Books" />;
    }

    return (
        <section className="space-y-6">
            <div className="section-header">
                <h2 className="text-foreground tracking-tight">
                    Top Rated Single-Genre Books
                </h2>

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
                                        src={
                                            book.realCoverImage ||
                                            book.thumbnailUrl
                                        }
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

                                        <p
                                            className="book-author"
                                            title={book.author}
                                        >
                                            {book.author}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />

                                        <span className="font-medium text-foreground">
                                            {book.displayRating || "0.0"}
                                        </span>
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