import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonCarouselProps {
    title?: string;
}

export function SkeletonCarousel({ title = "Loading..." }: SkeletonCarouselProps) {
    return (
        <section className="space-y-6">
            <div className="section-header flex justify-between items-center">
                <Skeleton className="h-8 w-64" />
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </div>
            
            <div className="carousel-wrapper overflow-hidden">
                <div className="flex gap-4">
                    {Array.from({ length: 5 }).map((_, idx) => (
                        <Card key={idx} className="min-w-[200px] sm:min-w-[250px] overflow-hidden border bg-card">
                            <Skeleton className="h-[300px] w-full" />
                            <CardContent className="p-3.5 space-y-2">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
