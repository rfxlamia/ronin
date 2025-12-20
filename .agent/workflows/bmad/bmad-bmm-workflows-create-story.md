---
description: 'Create the next user story from epics+stories with enhanced context analysis and direct ready-for-dev marking'
---

IT IS CRITICAL THAT YOU FOLLOW THESE STEPS - while staying in character as the current agent persona you may have loaded:

<steps CRITICAL="TRUE">
// turbo
1. Run `node scripts/generate-manifest.cjs` to update the project file manifest.
2. Always check for the existence of `filepath.md` in the project root to understand current file structure.
2. Always LOAD the FULL @_bmad/core/tasks/workflow.xml
3. READ its entire contents - this is the CORE OS for EXECUTING the specific workflow-config @_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml
4. Pass the yaml path _bmad/bmm/workflows/4-implementation/create-story/workflow.yaml as 'workflow-config' parameter to the workflow.xml instructions
5. Follow workflow.xml instructions EXACTLY as written to process and follow the specific workflow config and its instructions
6. Save outputs after EACH section when generating any documents from templates
</steps>
