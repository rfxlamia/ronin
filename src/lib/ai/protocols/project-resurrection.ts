import { ReasoningProtocol } from '@/types/agent';

export const PROJECT_RESURRECTION_PROTOCOL: ReasoningProtocol = {
    id: 'project-resurrection',
    title: 'Deep Project Analysis',
    description: 'Autonomous analysis of dormant projects using multi-step reasoning',
    steps: [
        {
            id: 'step-01-scan-structure',
            title: 'Scan Project Structure',
            instruction: 'List the root directory files to identify the project type and structure. Look for key configuration files.',
            requiredOutput: 'none'
        },
        {
            id: 'step-02-read-metadata',
            title: 'Read Project Metadata',
            instruction: 'Read package.json, Cargo.toml, or requirements.txt to understand project dependencies and scripts.',
            requiredOutput: 'none'
        },
        {
            id: 'step-03-analyze-git',
            title: 'Analyze Git History',
            instruction: 'Check the current git status and read recent git logs to determine the last active work and uncommitted changes.',
            requiredOutput: 'none'
        },
        {
            id: 'step-04-check-devlog',
            title: 'Review Developer Log',
            instruction: 'Check for the existence of DEVLOG.md or similar notes. If present, read it to understand recent thoughts or todolists.',
            requiredOutput: 'none'
        },
        {
            id: 'step-05-synthesize',
            title: 'Synthesize Context',
            instruction: 'Synthesize all findings into a concise Resurrection Report. State the Project Type, Last Active Area, Current State, and suggested Next Steps.',
            requiredOutput: 'none'
        }
    ]
};
