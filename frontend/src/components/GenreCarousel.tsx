import { useState, useRef, useMemo, useEffect } from "react";
import { BookCard } from "@/components/BookCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Book } from "@/lib/mock-data";

interface GenreCarouselProps {
  title: string;
  books: Book[];
  hideRatings?: boolean;
  hideRatingCount?: boolean;
  isNewArrival?: boolean;
}

export function GenreCarousel({ title, books, hideRatings = false, hideRatingCount = false, isNewArrival = false }: GenreCarouselProps) {
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

  if (books.length === 0) return null;

  return (
    <section className="space-y-6">
      <div className="section-header">
        <h2 className="text-foreground tracking-tight">{title}</h2>
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
            <div key={`${book.id}-${idx}`} onDragStart={(e) => e.preventDefault()}>
              <BookCard book={book} compact hideRatings={hideRatings} hideRatingCount={hideRatingCount} isNewArrival={isNewArrival} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
