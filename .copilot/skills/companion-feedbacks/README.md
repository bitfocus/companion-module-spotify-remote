# Companion Feedbacks

Implement Bitfocus Companion feedbacks for boolean styling, advanced rendering, and
state-driven updates. This plugin packages the guidance from `SKILL.md` into
marketplace-ready metadata so agents can discover and apply the pattern quickly during
Bitfocus Companion module work.

## When to Use

- You need buttons to reflect device state through color, text, or graphics.

- You are choosing between boolean and advanced feedback definitions.

- You need help with `defaultStyle`, render output, or feedback options.

- You must call `checkFeedbacks()` or `checkAllFeedbacks()` after state changes.

## Installation

### GitHub Copilot CLI

```bash
copilot plugin marketplace add digitaldrummerj/bitfocus-companion-skill
copilot plugin install companion-feedbacks@bitfocus-companion-skills
```

### Manual

Copy this directory to `.github/skills/companion-feedbacks/` in your project.

## What It Covers

- The Companion feedback APIs for boolean and advanced feedbacks.

- Style properties such as colors, text, size, and alignment.

- Patterns for reading cached module state quickly inside callbacks.

- Subscription lifecycles and re-check triggers for stateful feedbacks.

## Example Requests

- "add feedback"

- "button colors"

- "help with feedbacks"

## Activation Hints

- It is a strong match for requests about `add feedback`.

- It also fits prompts mentioning `button colors`.

- Use it when work is clearly about Bitfocus Companion modules and `feedbacks`.

- It pairs well with other Companion skills when a task spans actions, feedbacks, presets, or review workflows.

## Files

- `SKILL.md` contains the full agent-facing guidance.

- `manifest.json` exposes searchable metadata for marketplaces and tooling.

- `plugin.json` provides Copilot CLI plugin metadata for installation.

## License

MIT.
