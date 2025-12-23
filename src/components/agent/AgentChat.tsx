import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAgentAnalysis } from '@/hooks/useAgentAnalysis';

interface AgentChatProps {
  projectId: string;
}

/**
 * AgentChat - Main chat interface for agent interactions
 * Handles streaming responses and attribution display
 */
export function AgentChat({ projectId }: AgentChatProps) {
  const { state, messages, error, analyze, isAnalyzing } = useAgentAnalysis(projectId);

  return (
    <div className="h-full flex flex-col">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-6">
        {messages.length === 0 ? (
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
            {messages.map((message, index) => (
              <div key={index}>
                {message.role === 'assistant' ? (
                  <Card className="p-6">
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none"
                      style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>

                    {message.attribution && (
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
                          <li>{message.attribution.files} files read</li>
                          <li>{message.attribution.commits} commits analyzed</li>
                          {message.attribution.sources?.slice(0, 3).map((file, i) => (
                            <li key={i}>• {file}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                ) : (
                  <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                    {message.content}
                  </p>
                )}
              </div>
            ))}

            {/* Show error state */}
            {state === 'error' && error && (
              <Card className="p-6 border-destructive bg-destructive/10">
                <p className="text-sm text-destructive" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                  Analysis failed: {error}
                </p>
              </Card>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Action Bar */}
      <div className="border-t border-border p-6">
        <Button
          onClick={analyze}
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
              Analyze Project
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
