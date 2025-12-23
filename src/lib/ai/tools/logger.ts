import { useReasoningStore } from '../../../stores/reasoningStore';

/**
 * Log a tool execution to the reasoning store for UI display.
 * Per AC #2.E: logToolCall(projectId, tool, params, result)
 * 
 * @param projectId - The project context
 * @param stepId - The current step ID (if any)
 * @param toolName - Name of the tool executed
 * @param args - Arguments passed to the tool
 * @param result - Result returned from the tool (optional, for display/debugging)
 */
export function logToolCall(
    projectId: string,
    stepId: string | undefined,
    toolName: string,
    args: any,
    result?: any
) {
    if (!stepId) return;

    // Format args as key=value string for readability
    let argsStr = '';
    if (typeof args === 'object' && args !== null) {
        // Filter out error field for cleaner display
        const cleanArgs = Object.fromEntries(
            Object.entries(args).filter(([k]) => k !== 'error')
        );
        argsStr = Object.entries(cleanArgs)
            .map(([k, v]) => {
                // Truncate long strings for display
                let valStr = JSON.stringify(v);
                if (valStr.length > 50) {
                    valStr = valStr.substring(0, 47) + '..."';
                }
                return `${k}=${valStr}`;
            })
            .join(', ');
    } else {
        argsStr = JSON.stringify(args);
    }

    // Format result size for display (e.g., "→ 1.2KB" or "→ 15 files")
    let resultStr = '';
    if (result !== undefined && result !== null) {
        if (typeof result === 'string') {
            const kb = (result.length / 1024).toFixed(1);
            resultStr = ` → ${kb}KB`;
        } else if (Array.isArray(result)) {
            resultStr = ` → ${result.length} items`;
        } else if (typeof result === 'object') {
            resultStr = ` → object`;
        }
    }

    const formattedCall = `${toolName}(${argsStr})${resultStr}`;

    // Append to live tool calls in store
    useReasoningStore.getState().appendToolCall(projectId, formattedCall);
}
