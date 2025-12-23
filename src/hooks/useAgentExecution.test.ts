import { renderHook, act } from '@testing-library/react';
import { useAgentExecution } from './useAgentExecution';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useReasoningStore } from '@/stores/reasoningStore';
import * as ai from 'ai';

// Mock stores
vi.mock('@/stores/reasoningStore', () => ({
    useReasoningStore: vi.fn()
}));

vi.mock('@/stores/aiStore', () => ({
    useAiStore: vi.fn((selector) => selector({ defaultProvider: 'mock-provider' }))
}));

// Mock client
vi.mock('@/lib/ai/client', () => ({
    createTauriLanguageModel: vi.fn(() => ({})),
    getWrappedTools: vi.fn(() => ({}))
}));

// Mock AI SDK
vi.mock('ai', () => ({
    generateText: vi.fn()
}));

describe('useAgentExecution', () => {
    const mockStartProtocol = vi.fn();
    const mockSetActiveStep = vi.fn();
    const mockCompleteStep = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useReasoningStore as any).mockReturnValue({
            startProtocol: mockStartProtocol,
            setActiveStep: mockSetActiveStep,
            completeStep: mockCompleteStep,
        });
        (useReasoningStore as any).getState = () => ({
            startProtocol: mockStartProtocol,
            setActiveStep: mockSetActiveStep,
            completeStep: mockCompleteStep,
        });
    });

    it('should initialize with idle status and retry function', () => {
        const { result } = renderHook(() => useAgentExecution());
        expect(result.current.status).toBe('idle');
        expect(typeof result.current.retry).toBe('function');
    });

    it('should execute protocol steps', async () => {
        // Mock generateText to return dummy text
        (ai.generateText as any).mockResolvedValue({ text: 'Mock analysis result' });

        const { result } = renderHook(() => useAgentExecution());

        await act(async () => {
            await result.current.execute(123);
        });

        expect(result.current.status).toBe('complete');
        // Check if protocol started
        expect(mockStartProtocol).toHaveBeenCalledWith('123', 'project-resurrection');

        // Check if steps were executed (Protocol has 5 steps)
        expect(mockSetActiveStep).toHaveBeenCalledTimes(5);
        expect(mockCompleteStep).toHaveBeenCalledTimes(5);

        // Check final response
        expect(result.current.response).toContain('Mock analysis result');
    });

    it('should handle errors', async () => {
        (ai.generateText as any).mockRejectedValue(new Error('AI Failed'));

        const { result } = renderHook(() => useAgentExecution());

        await act(async () => {
            await result.current.execute(123);
        });

        expect(result.current.status).toBe('error');
        expect(result.current.error).toBe('AI Failed');
    });

    it('should retry with last projectId', async () => {
        (ai.generateText as any).mockResolvedValue({ text: 'Retry result' });

        const { result } = renderHook(() => useAgentExecution());

        // First execution
        await act(async () => {
            await result.current.execute(456);
        });

        expect(mockStartProtocol).toHaveBeenCalledWith('456', 'project-resurrection');

        // Clear mocks and retry
        vi.clearAllMocks();
        (ai.generateText as any).mockResolvedValue({ text: 'Retry result' });

        await act(async () => {
            await result.current.retry();
        });

        // Should be called again with same projectId
        expect(mockStartProtocol).toHaveBeenCalledWith('456', 'project-resurrection');
    });
});

