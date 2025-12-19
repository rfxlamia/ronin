import { useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjectStore, type FilterStatus } from '@/stores/projectStore';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { Project } from '@/types/project';

export const DashboardHeader = () => {
    const searchQuery = useProjectStore((state) => state.searchQuery);
    const filterStatus = useProjectStore((state) => state.filterStatus);
    const setSearchQuery = useProjectStore((state) => state.setSearchQuery);
    const setFilterStatus = useProjectStore((state) => state.setFilterStatus);
    const addProject = useProjectStore((state) => state.addProject);
    const setError = useProjectStore((state) => state.setError);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Keyboard shortcut: Ctrl+K (or Cmd+K on macOS) to focus search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            // Escape to clear search, reset filter to 'all', or blur
            if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
                if (searchQuery) {
                    setSearchQuery('');
                    setFilterStatus('all'); // Reset filter when clearing search
                } else {
                    searchInputRef.current?.blur();
                }
            }
            // ArrowDown or Tab from search focuses first project card
            if ((e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) &&
                document.activeElement === searchInputRef.current) {
                const firstCard = document.querySelector('[data-project-card]');
                if (firstCard instanceof HTMLElement) {
                    e.preventDefault();
                    firstCard.focus();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [searchQuery, setSearchQuery, setFilterStatus]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleFilterChange = (value: string) => {
        setFilterStatus(value as FilterStatus);
    };

    const handleAddProject = async () => {
        try {
            const result = await open({
                title: 'Select Project Folder',
                directory: true,
                multiple: false,
            });

            if (!result) return;

            const response = await invoke<Project>('add_project', {
                path: result,
            });

            addProject(response);
        } catch (error) {
            setError(String(error));
        }
    };

    return (
        <div className="flex flex-col gap-4 mb-6">
            {/* Search and Add Project Row */}
            <div className="flex items-center gap-4">
                {/* Search Input */}
                <div className="relative flex-1">
                    <Search
                        data-icon="search"
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ronin-secondary)]"
                        aria-hidden="true"
                    />
                    <Input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        aria-label="Search projects"
                        className="pl-10 font-sans"
                    />
                </div>

                {/* Add Project Button */}
                <Button
                    onClick={handleAddProject}
                    className="font-serif px-6"
                >
                    Add Project
                </Button>
            </div>

            {/* Filter Tabs */}
            <Tabs value={filterStatus} onValueChange={handleFilterChange}>
                <TabsList className="w-full sm:w-auto">
                    <TabsTrigger value="all" className="font-sans">
                        All
                    </TabsTrigger>
                    <TabsTrigger value="active" className="font-sans">
                        Active
                    </TabsTrigger>
                    <TabsTrigger value="dormant" className="font-sans">
                        Dormant
                    </TabsTrigger>
                    <TabsTrigger value="archived" className="font-sans">
                        Archived
                    </TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
    );
};
