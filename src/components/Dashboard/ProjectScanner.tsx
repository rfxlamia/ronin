import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { invoke } from '@tauri-apps/api/core';
import { RoninLoader } from '@/components/ui/loader';
import { Project } from '@/types/project';
import { useProjectStore } from '@/stores/projectStore';

interface ScannedProject {
  path: string;
  name: string;
}

interface ProjectScannerProps {
  onImportComplete?: (projects: Project[]) => void;
}

export const ProjectScanner = ({ onImportComplete }: ProjectScannerProps) => {
  const addProject = useProjectStore((state) => state.addProject);
  const [scanning, setScanning] = useState(false);
  const [scannedProjects, setScannedProjects] = useState<ScannedProject[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // When projects are scanned, initially select all by default
    if (scannedProjects.length > 0 && selectedProjects.size === 0) {
      const allPaths = new Set(scannedProjects.map(p => p.path));
      setSelectedProjects(allPaths);
    }
  }, [scannedProjects, selectedProjects.size]);

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    setScannedProjects([]);

    try {
      const projects: ScannedProject[] = await invoke('scan_projects');
      setScannedProjects(projects);
    } catch (err) {
      console.error('Error scanning projects:', err);
      setError('Failed to scan for projects. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleProjectToggle = (path: string) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedProjects(newSelected);
  };

  const handleImportSelected = async () => {
    if (selectedProjects.size === 0) return;

    const results = await Promise.allSettled(
      [...selectedProjects].map(async (path) => {
        const project: Project = await invoke('add_project', { path });
        addProject(project);
        return project;
      })
    );

    const failed = results.filter((r) => r.status === 'rejected');
    const succeeded = results
      .filter((r): r is PromiseFulfilledResult<Project> => r.status === 'fulfilled')
      .map((r) => r.value);

    if (failed.length > 0) {
      const failedReasons = failed
        .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)))
        .filter((msg, idx, arr) => arr.indexOf(msg) === idx); // deduplicate
      setError(
        `${failed.length} project(s) failed to import. ${succeeded.length} succeeded.` +
        (failedReasons.length > 0 ? ` Errors: ${failedReasons.join(', ')}` : '')
      );
    }

    if (succeeded.length > 0) {
      onImportComplete?.(succeeded);
      setScannedProjects([]);
      setSelectedProjects(new Set());
    }
    // Jika semua gagal: scanner tetap terbuka agar user bisa retry
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Scan for Projects</CardTitle>
        <CardDescription>Automatically discover Git repositories on your system</CardDescription>
      </CardHeader>
      <CardContent>
        {scanning ? (
          <div className="flex flex-col items-center justify-center py-8">
            <RoninLoader className="h-12 w-12" />
            <p className="mt-4 text-center text-muted-foreground">
              Scanning your system for Git repositories...
            </p>
          </div>
        ) : scannedProjects.length > 0 ? (
          <div className="space-y-4">
            <div className="max-h-64 overflow-y-auto">
              {scannedProjects.map((project) => (
                <div
                  key={project.path}
                  className="flex items-center space-x-4 py-2 border-b border-border last:border-b-0"
                >
                  <Checkbox
                    id={`project-${project.path}`}
                    checked={selectedProjects.has(project.path)}
                    onCheckedChange={() => handleProjectToggle(project.path)}
                  />
                  <div className="grid gap-1">
                    <label
                      htmlFor={`project-${project.path}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {project.name}
                    </label>
                    <p className="text-xs text-muted-foreground truncate max-w-xs md:max-w-md">
                      {project.path}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-muted-foreground">
              Click "Scan for Projects" to discover Git repositories on your system
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive rounded-md text-destructive">
            {error}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row sm:justify-between gap-3">
        <Button
          variant="outline"
          onClick={handleScan}
          disabled={scanning}
        >
          {scanning ? 'Scanning...' : 'Scan for Projects'}
        </Button>

        {scannedProjects.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => {
                setScannedProjects([]);
                setSelectedProjects(new Set());
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportSelected}
              disabled={selectedProjects.size === 0}
            >
              Import Selected ({selectedProjects.size})
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};