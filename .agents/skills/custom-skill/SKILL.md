---
name: custom-skill
description: >-
  Use this skill as a template to perform specific custom workflows, scripts, or
  runbooks in this workspace. Modify this description to tell the agent exactly
  when it should trigger this skill.
---

# Custom Skill Template

Welcome to your custom workspace skill! Antigravity automatically discovers and loads this skill because it is placed in the `.agents/skills/` directory.

To customize this skill:
1. Edit the `name` field in the frontmatter above (use lowercase with hyphens, e.g., `deploy-project`).
2. Edit the `description` field in the frontmatter above. This description tells the agent when to activate the skill (e.g., "Use this skill when the user wants to deploy the project to production").
3. Update the steps below with your actual workflow instructions, command sequences, and verify checks.

## Steps

1. **Step One**: Run a workspace check.
   - Example command: `npm run lint` or custom script `./scripts/check.sh`.
2. **Step Two**: Perform the main action.
   - Describe the files to modify, tools to run, or inputs required.
3. **Step Three**: Verify success.
   - What output files or log messages should the agent check to confirm the task succeeded?

## Helper Scripts

You can place executable scripts in a `scripts/` directory next to this file (e.g., `.agents/skills/custom-skill/scripts/`).
You can link them here for the agent to run, like this:
[run.sh](./scripts/run.sh)
