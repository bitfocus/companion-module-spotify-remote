# Companion Actions

Implement Bitfocus Companion actions with typed definitions, options, callbacks, and
lifecycle hooks. This plugin packages the guidance from `SKILL.md` into marketplace-
ready metadata so agents can discover and apply the pattern quickly during Bitfocus
Companion module work.

## When to Use

- You need to add a new action or button command to a module.

- You are defining text, number, dropdown, checkbox, or other action options.

- You need help with action callbacks, `subscribe`, or `unsubscribe`.

- You must re-register actions when device capabilities or state change.

## Installation

### GitHub Copilot CLI

```bash
copilot plugin marketplace add digitaldrummerj/bitfocus-companion-skill
copilot plugin install companion-actions@bitfocus-companion-skills
```

### Manual

Copy this directory to `.github/skills/companion-actions/` in your project.

## What It Covers

- The `CompanionActionDefinition` API and related event types.

- Option field patterns for common Companion input controls.

- Callback implementations that read options and call device code.

- Dynamic action re-registration when runtime capabilities change.

## Example Requests

- "add action"

- "button command"

- "help with actions"

## Activation Hints

- It is a strong match for requests about `add action`.

- It also fits prompts mentioning `button command`.

- Use it when work is clearly about Bitfocus Companion modules and `actions`.

- It pairs well with other Companion skills when a task spans actions, feedbacks, presets, or review workflows.

## Files

- `SKILL.md` contains the full agent-facing guidance.

- `manifest.json` exposes searchable metadata for marketplaces and tooling.

- `plugin.json` provides Copilot CLI plugin metadata for installation.

## License

MIT.
