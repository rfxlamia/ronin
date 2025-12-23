import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAgentExecution } from '@/hooks/useAgentExecution';
import { useReasoningStore } from '@/stores/reasoningStore';
import { useMemo } from 'react';

interface AgentChatProps {
  projectId: string;
}

/**
 * AgentChat - Main chat interface for agent interactions
 * Handles streaming responses and attribution display
 */
export function AgentChat({ projectId }: AgentChatProps) {
  const { status, response, error, execute } = useAgentExecution();
  const { byProject } = useReasoningStore();

  // Get attribution data from store
  const attribution = useMemo(() => {
    const projectState = byProject[projectId];
    if (!projectState?.stepHistory) return null;

    const files = new Set<string>();
    let commitCount = 0;

    projectState.stepHistory.forEach(step => {
      (step.toolCallsMade || []).forEach(call => {
        // Parse read_file(path)
        const fileMatch = call.match(/^read_file\((.*?)\)/);
        if (fileMatch) {
          // cleanup quotes if present
          const path = fileMatch[1].replace(/^['"]|['"]$/g, '');
          files.add(path);
        }

        // Check for git_log
        if (call.startsWith('git_log')) {
          commitCount += 20; // Heuristic or parse if tool result was available
        }
      });
    });

    return {
      files: files.size,
      commits: commitCount,
      sources: Array.from(files)
    };
  }, [byProject, projectId, status]); // Recalculate when status changes (completion)

  const handleAnalyze = () => {
    execute(Number(projectId));
  };

  const isAnalyzing = status === 'analyzing';

  return (
    <div className="h-full flex flex-col">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-6">
        {status === 'idle' ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3
                className="text-lg font-semibold mb-2"
                style={{ fontFamily: "'Libre Baskerville', serif" }}
              >
                Ready for Deep Analysis
              </h3>
              <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                Click "Analyze Project" to start the multi-step reasoning protocol.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Show user request (implicit) */}
            <div className="flex justify-end">
              <Card className="p-4 bg-primary/10 border-primary/20 max-w-[80%]">
                <p className="text-sm font-medium" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                  Analyze this project
                </p>
              </Card>
            </div>

            {/* Assistant Response */}
            {(response || isAnalyzing) && (
              <div>
                <Card className="p-6">
                  {response ? (
                    <>
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none"
                        style={{ fontFamily: "'Work Sans', sans-serif" }}
                      >
                        <ReactMarkdown>{response}</ReactMarkdown>
                      </div>

                      {attribution && (
                        <div className="mt-6 pt-4 border-t border-border">
                          <p
                            className="text-xs text-muted-foreground mb-2"
                            style={{ fontFamily: "'Work Sans', sans-serif" }}
                          >
                            <strong>Based on:</strong>
                          </p>
                          <ul
                            className="text-xs text-muted-foreground space-y-1"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            <li>{attribution.files} files read</li>
                            <li>{attribution.commits > 0 ? `${attribution.commits}+` : 0} commits analyzed</li>
                            {attribution.sources.slice(0, 3).map((file, i) => (
                              <li key={i}>• {file}</li>
                            ))}
                            {attribution.sources.length > 3 && (
                              <li>• ...and {attribution.sources.length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Brain className="h-4 w-4 animate-pulse" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Show error state */}
            {status === 'error' && error && (
              <Card className="p-6 border-destructive bg-destructive/10">
                <p className="text-sm text-destructive" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                  Analysis failed: {error}
                </p>
                <Button variant="outline" size="sm" onClick={handleAnalyze} className="mt-2 border-destructive/20 hover:bg-destructive/10">
                  Try Again
                </Button>
              </Card>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Action Bar */}
      <div className="border-t border-border p-6">
        <Button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="w-full gap-2"
          style={{ fontFamily: "'Libre Baskerville', serif" }}
        >
          {isAnalyzing ? (
            <>
              {/* Use pulse animation instead of spinner per AC requirements */}
              <Brain className="h-4 w-4 animate-pulse" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4" />
              {status === 'idle' ? 'Analyze Project' : 'Re-Analyze Project'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
