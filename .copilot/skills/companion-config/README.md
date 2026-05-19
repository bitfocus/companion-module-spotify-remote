# Companion Config

Define and validate Bitfocus Companion configuration fields, defaults, and configUpdated
behavior. This plugin packages the guidance from `SKILL.md` into marketplace-ready
metadata so agents can discover and apply the pattern quickly during Bitfocus Companion
module work.

## When to Use

- You need to add host, port, credential, or feature-toggle settings.

- You are choosing the right Companion field type for a new option.

- You need regex, min/max, default values, or other validation rules.

- You must reconnect or refresh module state inside `configUpdated()`.

## Installation

### GitHub Copilot CLI

```bash
copilot plugin marketplace add digitaldrummerj/bitfocus-companion-skill
copilot plugin install companion-config@bitfocus-companion-skills
```

### Manual

Copy this directory to `.github/skills/companion-config/` in your project.

## What It Covers

- The `SomeCompanionConfigField` family of input types.

- How to keep `ModuleConfig` aligned with field IDs and value types.

- Examples for text, number, dropdown, checkbox, color, secret, and Bonjour fields.

- Patterns for handling config changes and reconnecting safely.

## Example Requests

- "add config field"

- "connection settings"

- "help with config"

## Activation Hints

- It is a strong match for requests about `add config field`.

- It also fits prompts mentioning `connection settings`.

- Use it when work is clearly about Bitfocus Companion modules and `config`.

- It pairs well with other Companion skills when a task spans actions, feedbacks, presets, or review workflows.

## Files

- `SKILL.md` contains the full agent-facing guidance.

- `manifest.json` exposes searchable metadata for marketplaces and tooling.

- `plugin.json` provides Copilot CLI plugin metadata for installation.

## License

MIT.
