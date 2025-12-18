import { AddProjectButton } from './AddProjectButton';

export function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[600px] px-8">
            {/* Illustration */}
            <img
                src="/assets/empty-states/ronin-empty-welcome.svg"
                alt="Ronin standing at the beginning of a path"
                className="mb-8 w-full max-w-lg"
                style={{ maxHeight: '320px', objectFit: 'contain' }}
            />

            {/* Welcome message */}
            <h2 className="text-4xl font-serif font-bold mb-3 text-center">
                Your journey begins
            </h2>
            <p className="text-muted-foreground mb-8 text-center max-w-md">
                Add your first project to start tracking your work with Ronin
            </p>

            {/* Add Project button */}
            <AddProjectButton />
        </div>
    );
}
