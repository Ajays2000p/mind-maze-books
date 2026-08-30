import { useState, useEffect, useRef, useMemo, memo } from "react";
import { rankingApi } from "@/services/api";
import { BookCard } from "@/components/BookCard";
import { SkeletonCarousel } from "@/components/SkeletonCarousel";

export const TopRatedMultiGenreCarousel = memo(function TopRatedMultiGenreCarousel() {
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(8);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Mouse drag states
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

    const fetchTopRated = async () => {
        setLoading(true);
        try {
            const { data } = await rankingApi.getTopRated({
                multiGenre: true,
                limit: 25,
            });

            const rawBooks = Array.isArray(data)
                ? data
                : data?.books || [];

            const mapped = rawBooks.map((b: any) => ({
                ...b,
                id: b._id || b.id,
                title: b.title,
                author: b.author,
                coverUrl: b.realCoverImage || b.thumbnailUrl || b.coverUrl,
                genre: Array.isArray(b.genres) ? b.genres : (Array.isArray(b.genre) ? b.genre : [b.genre || 'General']),
                averageRating: typeof b.averageRating === 'number' ? b.averageRating : (typeof b.rating === 'number' ? b.rating : 4.5),
                ratingCount: b.ratingCount !== undefined ? b.ratingCount : 0
            }));

            setBooks(mapped);
        } catch (error) {
            console.error("Failed to fetch top rated multi-genre books", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTopRated();

        const handleRatingUpdate = () => {
            fetchTopRated();
        };

        window.addEventListener("ratingUpdated", handleRatingUpdate);
        return () => {
            window.removeEventListener("ratingUpdated", handleRatingUpdate);
        };
    }, []);

    useEffect(() => {
        if (books.length > 8 && visibleCount < books.length) {
            const timer = setTimeout(() => {
                setVisibleCount(books.length);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [books, visibleCount]);

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
        return (books || []).slice(0, Math.min(25, visibleCount));
    }, [books, visibleCount]);

    if (loading) {
        return <SkeletonCarousel title="Top Rated Multi-Genre Books" />;
    }

    if (displayBooks.length === 0) return null;

    return (
        <section className="space-y-6">
            <div className="section-header">
                <h2 className="text-foreground tracking-tight">
                    Top Rated Multi-Genre Books
                </h2>

                <div className="arrow-controls">
                    <button onClick={scrollLeft} aria-label="Scroll left">‹</button>
                    <button onClick={scrollRight} aria-label="Scroll right">›</button>
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
                        <div key={`${book.id}-${idx}`} onDragStart={(e) => e.preventDefault()}>
                            <BookCard book={book} compact />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
});