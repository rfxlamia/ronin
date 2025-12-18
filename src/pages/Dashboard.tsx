export function Dashboard() {
    return (
        <div className="p-8">
            <h2 className="text-3xl font-serif font-bold mb-4">Dashboard</h2>
            <p className="text-muted-foreground mb-6">
                Your projects will appear here.
            </p>

            {/* Skeleton placeholder for future project cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="h-48 rounded-lg bg-muted animate-pulse"
                        style={{ animationDelay: `${i * 100}ms` }}
                    />
                ))}
            </div>
        </div>
    );
}
