# Companion Variable Definition

Declare and register Bitfocus Companion variables so they appear in the variable picker.
This plugin packages the guidance from `SKILL.md` into marketplace-ready metadata so
agents can discover and apply the pattern quickly during Bitfocus Companion module work.

## When to Use

- You need to expose new module state as Companion variables.

- You want variables to appear in Companion's picker before values are set.

- You are generating variable definitions from runtime capabilities such as channel count.

- You need a refresher on valid `variableId` naming rules.

## Installation

### GitHub Copilot CLI

```bash
copilot plugin marketplace add digitaldrummerj/bitfocus-companion-skill
copilot plugin install companion-variable-definition@bitfocus-companion-skills
```

### Manual

Copy this directory to `.github/skills/companion-variable-definition/` in your project.

## What It Covers

- How to build and register `CompanionVariableDefinition` entries.

- Valid variable ID naming and picker behavior.

- Static and dynamic definition registration patterns.

- Common mistakes such as setting values before definitions exist.

## Example Requests

- "setVariableDefinitions"

- "declare variable"

- "help with variable definition"

## Activation Hints

- It is a strong match for requests about `setVariableDefinitions`.

- It also fits prompts mentioning `declare variable`.

- Use it when work is clearly about Bitfocus Companion modules and `variables`.

- It pairs well with other Companion skills when a task spans actions, feedbacks, presets, or review workflows.

## Files

- `SKILL.md` contains the full agent-facing guidance.

- `manifest.json` exposes searchable metadata for marketplaces and tooling.

- `plugin.json` provides Copilot CLI plugin metadata for installation.

## License

MIT.
