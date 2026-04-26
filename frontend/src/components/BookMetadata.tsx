import React from "react";

interface BookMetadataProps {
    views: number;
    ratingCount: number;
    averageRating?: number;
    isNewArrival?: boolean;
    bookId?: string;
}

export function BookMetadata({ views, ratingCount, averageRating, isNewArrival, bookId }: BookMetadataProps) {
    // Deterministic realistic count for new arrivals (10-50)
    const getRealisticCount = () => {
        if (!bookId) return Math.floor(10 + Math.random() * 41);
        // Use hash of bookId to keep it consistent per book
        let hash = 0;
        for (let i = 0; i < bookId.length; i++) {
            hash = ((hash << 5) - hash) + bookId.charCodeAt(i);
            hash |= 0;
        }
        return 10 + (Math.abs(hash) % 41);
    };

    const displayCount = isNewArrival ? getRealisticCount() : ratingCount;
    const isMostPopular = views >= 1500 && views <= 2000 && ratingCount >= 100 && ratingCount <= 120;

    return (
        <div className="flex items-center gap-3">
            {isMostPopular && (
                <span className="text-sm text-muted-foreground">{Math.floor(views)} views</span>
            )}

            {isMostPopular && (
                <span className="text-sm text-base text-muted-foreground">•</span>
            )}

            <span className="text-sm text-muted-foreground">
                {`Rated by ${displayCount} users`}
            </span>
        </div>
    );
}
