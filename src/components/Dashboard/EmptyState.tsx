import { useState } from 'react';
import { AddProjectButton } from './AddProjectButton';
import { ProjectScanner } from './ProjectScanner';
import { Button } from '@/components/ui/button';

export function EmptyState() {
    const [showScanner, setShowScanner] = useState(false);

    if (showScanner) {
        return (
            <div className="max-w-2xl mx-auto w-full px-4 py-8">
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => setShowScanner(false)}
                        className="mb-4"
                    >
                        ← Back to welcome
                    </Button>
                    <h2 className="text-2xl font-bold">Find Existing Projects</h2>
                    <p className="text-muted-foreground">
                        Automatically scan your system for Git repositories
                    </p>
                </div>
                <ProjectScanner
                    onImportComplete={() => {
                        // Optionally show a success message or redirect
                        setShowScanner(false);
                    }}
                />
            </div>
        );
    }

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

            <p className="mt-6 text-sm text-muted-foreground text-center">
                Or <button
                    className="text-primary hover:underline"
                    onClick={() => setShowScanner(true)}
                >
                    scan for existing projects
                </button> on your system
            </p>
        </div>
    );
}
