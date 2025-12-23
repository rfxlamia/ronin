import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ModeToggle, ProtocolViewer, ThinkingIndicator, AgentChat } from '@/components/agent';
import { useReasoningStore } from '@/stores/reasoningStore';
import { useProjectStore } from '@/stores/projectStore';

/**
 * Agent Page - Dedicated interface for deep AI analysis
 * Visualizes the AI's reasoning process during multi-step protocols
 */
export function Agent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { byProject } = useReasoningStore();
  const projects = useProjectStore((state) => state.projects);
  const project = projects.find((p) => String(p.id) === id);
  const projectName = project?.name || 'Project';

  if (!id) {
    navigate('/', { replace: true });
    return null;
  }

  const handleDeactivate = () => {
    navigate('/');
  };

  const projectState = byProject[id];
  const isThinkingMode = projectState?.activeMode === 'ronin-thinking';

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeactivate}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span style={{ fontFamily: "'Libre Baskerville', serif" }}>
              Back to Dashboard
            </span>
          </Button>
          <div className="h-6 w-px bg-border" />
          <h1
            className="text-xl font-semibold"
            style={{ fontFamily: "'Libre Baskerville', serif" }}
          >
            {projectName}
          </h1>
        </div>

        {/* ModeToggle */}
        <ModeToggle projectId={id} />
      </header>

      {/* Main Layout: Sidebar + Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Protocol Viewer (only in Thinking mode) */}
        {isThinkingMode && (
          <aside className="w-80 border-r border-border overflow-y-auto">
            <ProtocolViewer projectId={id} />
          </aside>
        )}

        {/* Main Panel - Agent Chat */}
        <main className="flex-1 overflow-hidden relative">
          <AgentChat projectId={id} />

          {/* ThinkingIndicator Overlay (only when protocol is active) */}
          {projectState?.activeProtocol && (
            <div className="absolute top-4 right-4">
              <ThinkingIndicator projectId={id} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
