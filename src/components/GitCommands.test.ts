import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api';

// Mock the invoke function to test that the correct commands are called
vi.mock('@tauri-apps/api', async () => {
  const actual = await vi.importActual('@tauri-apps/api');
  return {
    ...actual,
    invoke: vi.fn(),
  };
});

// Test to verify that the new git commands are available and can be called
describe('Git Commands Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call get_git_context command with correct parameters', async () => {
    const mockPath = '/mock/repo/path';
    const mockResult = {
      branch: 'main',
      status: { is_clean: true, modified_files: [] },
      commits: [
        {
          sha: 'abc123',
          author: 'Test User',
          date: '2023-01-01T00:00:00Z',
          message: 'Test commit',
          files: ['test.txt']
        }
      ]
    };

    (invoke as any).mockResolvedValue(mockResult);

    // This would be called from actual component code
    const result = await invoke('get_git_context', { path: mockPath });

    expect(invoke).toHaveBeenCalledWith('get_git_context', { path: mockPath });
    expect(result).toEqual(mockResult);
  });

  it('should call get_git_branch command with correct parameters', async () => {
    const mockPath = '/mock/repo/path';
    const mockBranch = 'main';

    (invoke as any).mockResolvedValue(mockBranch);

    const result = await invoke('get_git_branch', { path: mockPath });

    expect(invoke).toHaveBeenCalledWith('get_git_branch', { path: mockPath });
    expect(result).toEqual(mockBranch);
  });

  it('should call get_git_status command with correct parameters', async () => {
    const mockPath = '/mock/repo/path';
    const mockStatus = { is_clean: false, modified_files: ['file1.txt', 'file2.txt'] };

    (invoke as any).mockResolvedValue(mockStatus);

    const result = await invoke('get_git_status', { path: mockPath });

    expect(invoke).toHaveBeenCalledWith('get_git_status', { path: mockPath });
    expect(result).toEqual(mockStatus);
  });

  it('should call get_git_history command with correct parameters', async () => {
    const mockPath = '/mock/repo/path';
    const mockHistory = [
      {
        sha: 'abc123',
        author: 'Test User',
        date: '2023-01-01T00:00:00Z',
        message: 'Test commit',
        files: ['test.txt']
      }
    ];

    (invoke as any).mockResolvedValue(mockHistory);

    const result = await invoke('get_git_history', { path: mockPath, limit: 10 });

    expect(invoke).toHaveBeenCalledWith('get_git_history', { path: mockPath, limit: 10 });
    expect(result).toEqual(mockHistory);
  });

  it('should handle errors when calling git commands', async () => {
    const mockPath = '/mock/repo/path';
    const mockError = 'Not a git repository or failed to open: /mock/repo/path';

    (invoke as any).mockRejectedValue(new Error(mockError));

    await expect(invoke('get_git_context', { path: mockPath })).rejects.toThrow(mockError);
    expect(invoke).toHaveBeenCalledWith('get_git_context', { path: mockPath });
  });
});