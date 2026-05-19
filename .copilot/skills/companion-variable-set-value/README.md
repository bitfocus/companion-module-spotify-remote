# Companion Variable Set Value

Set and read Bitfocus Companion variable values at runtime after the variables are
defined. This plugin packages the guidance from `SKILL.md` into marketplace-ready
metadata so agents can discover and apply the pattern quickly during Bitfocus Companion
module work.

## When to Use

- You need to set initial variable values during `init()`.

- You are updating variables from device events, polling, or message handlers.

- You want to read a variable's current value to compute the next one.

- You need a reminder about allowed value types and declaration order.

## Installation

### GitHub Copilot CLI

```bash
copilot plugin marketplace add digitaldrummerj/bitfocus-companion-skill
copilot plugin install companion-variable-set-value@bitfocus-companion-skills
```

### Manual

Copy this directory to `.github/skills/companion-variable-set-value/` in your project.

## What It Covers

- How to call `setVariableValues()` with one or many keys.

- How to read values with `getVariableValue()` and guard for `undefined`.

- Partial updates and allowed runtime value types.

- The required sequencing between variable definition and variable value updates.

## Example Requests

- "setVariableValues"

- "getVariableValue"

- "help with variable set value"

## Activation Hints

- It is a strong match for requests about `setVariableValues`.

- It also fits prompts mentioning `getVariableValue`.

- Use it when work is clearly about Bitfocus Companion modules and `variables`.

- It pairs well with other Companion skills when a task spans actions, feedbacks, presets, or review workflows.

## Files

- `SKILL.md` contains the full agent-facing guidance.

- `manifest.json` exposes searchable metadata for marketplaces and tooling.

- `plugin.json` provides Copilot CLI plugin metadata for installation.

## License

MIT.
