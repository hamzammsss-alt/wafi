---
name: create-skill
user-invocable: true
description: "Create a new SKILL.md file for VS Code agent customization. Use when you need to define a reusable multi-step workflow, scope it to the workspace, and validate skill frontmatter."
---

# Create SKILL.md

## Purpose

Help authors create a new VS Code skill file (`SKILL.md`) that documents a reusable workflow and can be invoked in chat.

## When to use

- You want to add a workspace-specific skill for a multi-step process.
- You need a reusable guide for creating skill metadata, structure, and validation.
- You are defining a new agent customization workflow that is more than a single prompt.

## Step-by-step process

1. Decide the target scope.
   - Workspace-specific: use `.github/skills/<name>/SKILL.md`
   - User profile: use `{{VSCODE_USER_PROMPTS_FOLDER}}/` for personal customizations
2. Choose the skill name.
   - Keep it short, descriptive, and unique.
   - Use kebab case for folder names.
3. Create the skill file with YAML frontmatter.
   - Required fields:
     - `name`
     - `user-invocable`
     - `description`
4. Add the body content.
   - Explain the purpose, when to use it, and the workflow steps.
   - Include quality checks and examples if helpful.
5. Validate the new skill.
   - Confirm the file path is correct.
   - Check YAML syntax: `---` markers, spaces instead of tabs, no unescaped colons in values.
   - Ensure `description` contains trigger words for discovery.

## Quality checks

- `name` matches the skill folder and is unique.
- `description` is specific and discoverable.
- The workflow is actionable and easy to follow.
- The skill file is stored under a recognized customization path.

## Example prompts

- "Create a new VS Code skill for reviewing API design workflows."
- "Help me write a SKILL.md that captures our code review steps."
- "Generate a workspace skill for building and validating new customization files."
