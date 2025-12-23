import { useState, useRef } from 'react';
import { streamText, CoreMessage, StepResult } from 'ai';
import { createTauriLanguageModel, getWrappedTools } from '@/lib/ai/client';
import { mockTools } from '@/lib/ai/tools';
import { RONIN_THINKING_PROMPT } from '@/lib/ai/prompts/ronin-thinking';
import { PROJECT_RESURRECTION_PROTOCOL } from '@/lib/ai/protocols/project-resurrection';

export default function DebugAgent() {
    const [input, setInput] = useState('Analyze the src directory and map the project structure.');
    const [history, setHistory] = useState<CoreMessage[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [streamOutput, setStreamOutput] = useState('');
    const [toolInvocations, setToolInvocations] = useState<any[]>([]);
    const [projectId, setProjectId] = useState('1');
    const [useRealTools, setUseRealTools] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepTimings, setStepTimings] = useState<number[]>([]);
    const stepStartTime = useRef<number>(0);
    const totalSteps = PROJECT_RESURRECTION_PROTOCOL.steps.length;

    const handleRun = async () => {
        if (!input.trim() || isRunning) return;

        setIsRunning(true);
        setStreamOutput('');
        setToolInvocations([]);
        setCurrentStep(0);
        setStepTimings([]);
        stepStartTime.current = Date.now();

        // Add user message to history
        const newHistory: CoreMessage[] = [
            ...history,
            { role: 'user', content: input }
        ];
        setHistory(newHistory);

        try {
            const model = createTauriLanguageModel({
                provider: 'openrouter',
                projectId: parseInt(projectId),
                mode: 'ronin-thinking'
            });

            const tools = useRealTools
                ? getWrappedTools(projectId, 'ronin-thinking')
                : mockTools;

            const { fullStream } = streamText({
                model,
                messages: [
                    { role: 'system', content: RONIN_THINKING_PROMPT },
                    ...newHistory
                ],
                tools: tools as any,
                maxSteps: 10, // Increased for protocol
                onStepFinish: (step: StepResult<any>) => {
                    console.log('Step finished:', step);
                    // Track execution time per step
                    const elapsed = Date.now() - stepStartTime.current;
                    setStepTimings(prev => [...prev, elapsed]);
                    stepStartTime.current = Date.now();

                    if (step.toolCalls.length > 0) {
                        setToolInvocations(prev => [...prev, ...step.toolCalls.map(tc => ({ ...tc, timestamp: Date.now() }))]);
                        // Increment step counter based on tool calls (heuristic)
                        setCurrentStep(prev => Math.min(prev + 1, totalSteps));
                    }
                }
            } as any);

            let currentText = '';

            for await (const part of fullStream) {
                if (part.type === 'text-delta') {
                    currentText += part.text;
                    setStreamOutput(currentText);
                }
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

    const runResurrectionProtocol = () => {
        setInput(`Execute the Project Resurrection Protocol:
1. Scan project structure
2. Read metadata (package.json/cargo.toml)
3. Analyze git history
4. Check DEVLOG
5. Synthesize report`);
        setUseRealTools(true);
    };

    const testRealReadFile = async () => {
        setStreamOutput('Testing read_file...');
        try {
            const tools = getWrappedTools(projectId, 'ronin-flash');
            // Manually execute wrapper
            // @ts-ignore
            const result = await tools.read_file.execute({ path: 'package.json' });
            setStreamOutput(`read_file result:\n${result.substring(0, 500)}...`);
        } catch (e: any) {
            setStreamOutput(`read_file failed: ${e.message}`);
        }
    };

    // AC #5.A: Test Error Handling button
    const testErrorHandling = async () => {
        setStreamOutput('Testing error handling with nonexistent.txt...');
        setUseRealTools(true);
        try {
            const tools = getWrappedTools(projectId, 'ronin-flash');
            // @ts-ignore - Try to read a file that doesn't exist
            await tools.read_file.execute({ path: 'nonexistent.txt' });
            setStreamOutput('ERROR: Should have thrown an error!');
        } catch (e: any) {
            setStreamOutput(`✓ Error handled gracefully:\n${e.message}\n\n(LLM would receive this error and continue)`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-8 font-mono">
            <header className="mb-8 border-b border-gray-800 pb-4">
                <h1 className="text-2xl font-bold text-blue-400">Agent Core Debugger</h1>
                <p className="text-sm text-gray-500">Story 4.5.1 & 4.5.2: Tool Validation</p>
            </header>

            <div className="grid grid-cols-2 gap-8">
                {/* Left: Input & Controls */}
                <div className="space-y-6">
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-400">Project ID</label>
                            <input
                                type="text"
                                value={projectId}
                                onChange={e => setProjectId(e.target.value)}
                                className="bg-black border border-gray-700 rounded p-2 text-sm w-20 text-white"
                            />
                        </div>

                        <div>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useRealTools}
                                    onChange={e => setUseRealTools(e.target.checked)}
                                    className="rounded bg-gray-800 border-gray-600"
                                />
                                <span className="text-sm text-gray-300">Use Real Tools (Tauri)</span>
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-400">Instruction</label>
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className="w-full bg-black border border-gray-700 rounded p-3 text-sm focus:border-blue-500 outline-none h-32 text-white"
                                placeholder="Enter a complex task..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleRun}
                                disabled={isRunning}
                                className={`w-full py-2 rounded font-medium transition-colors ${isRunning
                                    ? 'bg-blue-900/50 text-blue-300 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                                    }`}
                            >
                                {isRunning ? 'Agent Running...' : 'Start Reasoning Loop'}
                            </button>
                            <button
                                onClick={runResurrectionProtocol}
                                className="w-full py-2 rounded font-medium bg-purple-600 hover:bg-purple-500 text-white"
                            >
                                Load Protocol
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-2">
                            <button onClick={testRealReadFile} className="py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white">
                                Test read_file
                            </button>
                            <button onClick={() => { setInput("Check git status and log"); setUseRealTools(true); }} className="py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white">
                                Test Git
                            </button>
                            <button onClick={testErrorHandling} className="py-2 bg-red-800 hover:bg-red-700 rounded text-xs text-white">
                                Test Error
                            </button>
                        </div>
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
                    {/* Step Progression (AC #5.B) */}
                    {isRunning && (
                        <div className="bg-gray-900 p-4 rounded-lg border border-blue-900/30">
                            <h3 className="text-sm font-medium text-blue-400 mb-2">Protocol Progress</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-blue-300">Step {currentStep}/{totalSteps}</span>
                                {currentStep > 0 && currentStep <= PROJECT_RESURRECTION_PROTOCOL.steps.length && (
                                    <span className="text-sm text-gray-400">
                                        {PROJECT_RESURRECTION_PROTOCOL.steps[currentStep - 1]?.title} ✓
                                    </span>
                                )}
                            </div>
                            {/* Execution timer per step (AC #5.B) */}
                            {stepTimings.length > 0 && (
                                <div className="mt-2 text-xs text-gray-500">
                                    {stepTimings.map((t, i) => (
                                        <span key={i} className="mr-2">Step {i + 1}: {(t / 1000).toFixed(1)}s</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tool Calls Visualization */}
                    {toolInvocations.length > 0 && (
                        <div className="bg-gray-900 p-4 rounded-lg border border-yellow-900/30">
                            <h3 className="text-sm font-medium text-yellow-500 mb-2">Tool Invocations</h3>
                            <div className="space-y-2">
                                {toolInvocations.map((call, idx) => (
                                    <div key={idx} className="bg-black/50 p-2 rounded text-xs border-l-2 border-yellow-600 font-mono">
                                        <div className="flex justify-between">
                                            <span className="text-yellow-400">{call.toolName}</span>
                                            {/* Timestamp display (Issue #10) */}
                                            {call.timestamp && (
                                                <span className="text-gray-600 text-[10px]">
                                                    {new Date(call.timestamp).toLocaleTimeString()}
                                                </span>
                                            )}
                                        </div>
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
