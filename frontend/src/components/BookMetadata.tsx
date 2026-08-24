import React from "react";

interface BookMetadataProps {
    views: number;
    ratingCount: number;
    averageRating?: number;
    isNewArrival?: boolean;
    bookId?: string;
}

export function BookMetadata({ views, ratingCount, averageRating, isNewArrival, bookId }: BookMetadataProps) {
    const displayCount = ratingCount !== undefined ? ratingCount : 0;
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
