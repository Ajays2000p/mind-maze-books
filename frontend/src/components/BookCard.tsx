import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "@/components/StarRating";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { Loader2 } from "lucide-react";
import { bookApi } from "@/services/api";
import type { Book } from "@/lib/mock-data";

interface BookCardProps {
  book: Book;
  compact?: boolean;
  showReason?: boolean;
  showMatch?: boolean;
  hideRatings?: boolean;
  hideRatingCount?: boolean;
  isNewArrival?: boolean;
}

export function BookCard({ book, compact = false, showReason = false, showMatch = false, hideRatings = false, hideRatingCount = false, isNewArrival = false }: BookCardProps) {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token');
  const [coverSource, setCoverSource] = useState(book.coverUrl);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasError, setHasError] = useState(false);

  const getRealisticCount = () => {
    // Use hash of book.id to keep it consistent per book
    let hash = 0;
    const idStr = String(book.id || "");
    for (let i = 0; i < idStr.length; i++) {
        hash = ((hash << 5) - hash) + idStr.charCodeAt(i);
        hash |= 0;
    }
    return 10 + (Math.abs(hash) % 41);
  };

  const displayCount = isNewArrival ? getRealisticCount() : (book.ratingCount || 0);

  const handleImageError = async () => {
    if (hasError || isGenerating) return; // Prevent infinite loops
    setHasError(true);
    setIsGenerating(true);
    try {
      const response = await bookApi.generateCover(book.id);
      if (response.data && response.data.thumbnailUrl) {
        setCoverSource(response.data.thumbnailUrl);
        setHasError(false);
      }
    } catch (e) {
      console.error("Failed to generate cover fallback for", book.id);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Link to={`/book/${book.id}`} state={{ isNewArrival }} className="book-card">
      <Card className="group overflow-hidden border bg-card hover:shadow-xl transition-all duration-300">
        <div className="relative overflow-hidden bg-muted">
          {isGenerating ? (
            <div className="w-full h-[260px] flex flex-col items-center justify-center text-muted-foreground animate-pulse p-4 text-center">
              <Loader2 className="w-6 h-6 mb-2 animate-spin text-primary" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Generating Cover</span>
            </div>
          ) : (
            <img
              src={coverSource}
              alt={book.title}
              onError={handleImageError}
              className="transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />
          )}
        </div>
        <CardContent className={`p-3 flex flex-col justify-between flex-grow ${hideRatings ? 'text-center' : ''}`}>
          <div className="space-y-1">
            <h3 className="book-title">{book.title}</h3>
            <p className="book-author">{book.author}</p>
          </div>
          {!hideRatings && (
            isLoggedIn ? (
              <div className="flex items-center gap-2">
                <StarRating rating={book.averageRating} size={12} />
                <span className="text-xs text-muted-foreground">{book.averageRating.toFixed(1)}</span>
              </div>
            ) : (
              <div
                className="text-xs text-primary hover:underline cursor-pointer"
                onClick={(e) => { e.preventDefault(); navigate('/login'); }}
              >
                Sign in to rate this book
              </div>
            )
          )}
          {!compact && !hideRatings && (
            <div className="flex flex-wrap gap-1">
              {book.genre.map((g) => (
                <span key={g} className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">
                  {g}
                </span>
              ))}
            </div>
          )}
          {!hideRatings && !hideRatingCount && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Rated by {displayCount} users
            </p>
          )}
          {showReason && book.recommendationReason && (
            <p className="text-[11px] text-primary leading-tight pt-0.5">{book.recommendationReason}</p>
          )}
          {showMatch && book.matchScore && (
            <ConfidenceBar score={book.matchScore} label="Match" />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
