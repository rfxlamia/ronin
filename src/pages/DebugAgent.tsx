import React, { useState } from 'react';
import { streamText, CoreMessage } from 'ai';
import { createTauriLanguageModel } from '@/lib/ai/client';
import { mockTools } from '@/lib/ai/tools';
import { RONIN_THINKING_PROMPT } from '@/lib/ai/prompts/ronin-thinking';

export default function DebugAgent() {
    const [input, setInput] = useState('Analyze the src directory and map the project structure.');
    const [history, setHistory] = useState<CoreMessage[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [streamOutput, setStreamOutput] = useState('');
    const [toolInvocations, setToolInvocations] = useState<any[]>([]);

    const handleRun = async () => {
        if (!input.trim() || isRunning) return;

        setIsRunning(true);
        setStreamOutput('');
        setToolInvocations([]);

        // Add user message to history
        const newHistory: CoreMessage[] = [
            ...history,
            { role: 'user', content: input }
        ];
        setHistory(newHistory);

        try {
            const model = createTauriLanguageModel({
                provider: 'openrouter',
                projectId: 999 // Debug ID
            });

            const { fullStream } = streamText({
                model,
                messages: [
                    { role: 'system', content: RONIN_THINKING_PROMPT },
                    ...newHistory
                ],
                tools: mockTools,
                maxSteps: 5, // Safety limit
                onStepFinish: (step) => {
                    console.log('Step finished:', step);
                    if (step.toolCalls.length > 0) {
                        setToolInvocations(prev => [...prev, ...step.toolCalls]);
                    }
                }
            } as any);

            let currentText = '';

            for await (const part of fullStream) {
                if (part.type === 'text-delta') {
                    currentText += part.text;
                    setStreamOutput(currentText);
                }
                // Tool parts handled by onStepFinish or visualization here
            }

            // Add assistant response to history
            setHistory(prev => [...prev, { role: 'assistant', content: currentText }]);

        } catch (e: any) {
            console.error('Agent Error:', e);
            setStreamOutput(prev => prev + `\n\n[ERROR]: ${e.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-8 font-mono">
            <header className="mb-8 border-b border-gray-800 pb-4">
                <h1 className="text-2xl font-bold text-blue-400">Agent Core Debugger</h1>
                <p className="text-sm text-gray-500">Story 4.5.1: Reasoning Loop & Tool Validation</p>
            </header>

            <div className="grid grid-cols-2 gap-8">
                {/* Left: Input & Controls */}
                <div className="space-y-6">
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                        <label className="block text-sm font-medium mb-2 text-gray-400">Instruction</label>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="w-full bg-black border border-gray-700 rounded p-3 text-sm focus:border-blue-500 outline-none h-32"
                            placeholder="Enter a complex task..."
                        />
                        <button
                            onClick={handleRun}
                            disabled={isRunning}
                            className={`mt-4 w-full py-2 rounded font-medium transition-colors ${isRunning
                                ? 'bg-blue-900/50 text-blue-300 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-500 text-white'
                                }`}
                        >
                            {isRunning ? 'Agent Running...' : 'Start Reasoning Loop'}
                        </button>
                    </div>

                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                        <h3 className="text-sm font-medium text-gray-400 mb-2">History</h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {history.map((msg, idx) => (
                                <div key={idx} className={`text-xs p-2 rounded ${msg.role === 'user' ? 'bg-gray-800 text-blue-200' : 'bg-gray-800/50 text-green-200'
                                    }`}>
                                    <span className="font-bold uppercase mr-2 opacity-50">{msg.role}:</span>
                                    {typeof msg.content === 'string' ? msg.content.slice(0, 100) + '...' : '[Complex Content]'}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Output & State */}
                <div className="space-y-6">
                    {/* Tool Calls Visualization */}
                    {toolInvocations.length > 0 && (
                        <div className="bg-gray-900 p-4 rounded-lg border border-yellow-900/30">
                            <h3 className="text-sm font-medium text-yellow-500 mb-2">Tool Invocations</h3>
                            <div className="space-y-2">
                                {toolInvocations.map((call, idx) => (
                                    <div key={idx} className="bg-black/50 p-2 rounded text-xs border-l-2 border-yellow-600 font-mono">
                                        <div className="text-yellow-400">{call.toolName}</div>
                                        <div className="text-gray-500 truncate">{JSON.stringify(call.args)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Live Output */}
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 h-[500px] flex flex-col">
                        <h3 className="text-sm font-medium text-gray-400 mb-2">Live Stream</h3>
                        <pre className="flex-1 bg-black p-4 rounded text-xs overflow-auto whitespace-pre-wrap text-green-400">
                            {streamOutput || <span className="text-gray-700 italic">Waiting for output...</span>}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
}
