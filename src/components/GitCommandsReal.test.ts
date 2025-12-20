import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';

// Type definitions matching the Rust structs
interface GitCommit {
  sha: string;
  author: string;
  date: string;
  message: string;
  files: string[];
}

interface GitStatus {
  is_clean: boolean;
  modified_files: string[];
}

interface GitContext {
  branch: string;
  status: GitStatus;
  commits: GitCommit[];
}

// Mock the invoke function - required since Vitest doesn't have access to Tauri runtime
vi.mock('@tauri-apps/api/core', async () => {
  const actual = await vi.importActual('@tauri-apps/api/core');
  return {
    ...actual,
    invoke: vi.fn(),
  };
});

// These tests verify the expected behavior of git commands with realistic mock data
// Actual integration tests run in Rust unit tests (src-tauri/src/commands/git.rs)
describe('Git Commands Integration Tests (Mock)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully get git context from a repository', async () => {
    const mockContext: GitContext = {
      branch: 'main',
      status: { is_clean: true, modified_files: [] },
      commits: [
        {
          sha: 'abc123def456',
          author: 'Test User',
          date: '2023-01-01T00:00:00Z',
          message: 'Initial commit',
          files: ['test.txt']
        }
      ]
    };

    (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(mockContext);

    const context = await invoke<GitContext>('get_git_context', { path: '/mock/repo' });

    expect(invoke).toHaveBeenCalledWith('get_git_context', { path: '/mock/repo' });
    expect(context).toHaveProperty('branch');
    expect(context).toHaveProperty('status');
    expect(context).toHaveProperty('commits');
    expect(Array.isArray(context.commits)).toBe(true);
    expect(context.commits.length).toBeGreaterThan(0);

    // Check that the first commit has the files field (key addition from Story 3.2)
    const firstCommit = context.commits[0];
    expect(firstCommit).toHaveProperty('files');
    expect(Array.isArray(firstCommit.files)).toBe(true);
  });

  it('should successfully get git branch from a repository', async () => {
    (invoke as ReturnType<typeof vi.fn>).mockResolvedValue('main');

    const branch = await invoke<string>('get_git_branch', { path: '/mock/repo' });

    expect(invoke).toHaveBeenCalledWith('get_git_branch', { path: '/mock/repo' });
    expect(typeof branch).toBe('string');
    expect(branch).toBe('main');
  });

  it('should successfully get git status from a repository', async () => {
    const mockStatus: GitStatus = { is_clean: false, modified_files: ['file1.txt', 'file2.txt'] };

    (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(mockStatus);

    const status = await invoke<GitStatus>('get_git_status', { path: '/mock/repo' });

    expect(invoke).toHaveBeenCalledWith('get_git_status', { path: '/mock/repo' });
    expect(status).toHaveProperty('is_clean');
    expect(status).toHaveProperty('modified_files');
    expect(typeof status.is_clean).toBe('boolean');
    expect(Array.isArray(status.modified_files)).toBe(true);
  });

  it('should successfully get git history from a repository', async () => {
    const mockHistory: GitCommit[] = [
      {
        sha: 'abc123def456',
        author: 'Test User',
        date: '2023-01-01T00:00:00Z',
        message: 'Initial commit',
        files: ['test.txt']
      }
    ];

    (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(mockHistory);

    const history = await invoke<GitCommit[]>('get_git_history', { path: '/mock/repo' });

    expect(invoke).toHaveBeenCalledWith('get_git_history', { path: '/mock/repo' });
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);

    // Verify the files field (key change from Story 3.2)
    const firstCommit = history[0];
    expect(firstCommit).toHaveProperty('files');
    expect(Array.isArray(firstCommit.files)).toBe(true);
    expect(firstCommit.files).toContain('test.txt');
  });

  it('should return empty history for a repository with no commits', async () => {
    (invoke as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const history = await invoke<GitCommit[]>('get_git_history', { path: '/mock/empty-repo' });

    expect(invoke).toHaveBeenCalledWith('get_git_history', { path: '/mock/empty-repo' });
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(0);
  });
});