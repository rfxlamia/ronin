import { useProjectStore } from '@/stores/projectStore';
import { EmptyState } from '@/components/Dashboard/EmptyState';
import { ProjectCard } from '@/components/Dashboard/ProjectCard';

export function Dashboard() {
    const projects = useProjectStore((state) => state.projects);

    return (
        <div className="p-8">
            {projects.length === 0 ? (
                <EmptyState />
            ) : (
                <>
                    <h2 className="text-3xl font-serif font-bold mb-4">Dashboard</h2>
                    <p className="text-muted-foreground mb-6">
                        Your projects ({projects.length})
                    </p>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {projects.map((project) => (
                            <ProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
