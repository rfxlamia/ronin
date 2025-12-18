import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton that matches ProjectCard dimensions
 * Used during data loading to prevent layout shift
 */
export function ProjectCardSkeleton() {
    return (
        <Card
            className="overflow-hidden p-4"
            data-testid="project-card-skeleton"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-3">
                    {/* Title placeholder - matches Libre Baskerville height */}
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-6 w-48" />
                    </div>

                    {/* Badge and stats placeholder */}
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                </div>
            </div>
        </Card>
    );
}
