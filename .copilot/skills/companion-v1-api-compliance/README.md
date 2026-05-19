# Companion v1 API Compliance

Review @companion-module/base v1.x modules for required lifecycle behavior and version-
specific compliance. This plugin packages the guidance from `SKILL.md` into marketplace-
ready metadata so agents can discover and apply the pattern quickly during Bitfocus
Companion module work.

## When to Use

- You are reviewing a module that still depends on `@companion-module/base` v1.x.

- You need to verify `runEntrypoint`, lifecycle methods, and upgrade scripts.

- You want to flag deprecated patterns introduced across v1.5 through v1.14.

- You need upgrade recommendations for future releases or v2 migration.

## Installation

### GitHub Copilot CLI

```bash
copilot plugin marketplace add digitaldrummerj/bitfocus-companion-skill
copilot plugin install companion-v1-api-compliance@bitfocus-companion-skills
```

### Manual

Copy this directory to `.github/skills/companion-v1-api-compliance/` in your project.

## What It Covers

- Required checks that apply to every v1.x Companion module.

- Per-version compliance rules from v1.5 through v1.14.

- Deprecated patterns such as old visibility callbacks or redundant variable parsing.

- Upgrade recommendations for newer API versions.

## Example Requests

- "v1 api compliance"

- "base v1.x"

- "help with v1 api compliance"

## Activation Hints

- It is a strong match for requests about `v1 api compliance`.

- It also fits prompts mentioning `base v1.x`.

- Use it when work is clearly about Bitfocus Companion modules and `compliance`.

- It pairs well with other Companion skills when a task spans actions, feedbacks, presets, or review workflows.

## Files

- `SKILL.md` contains the full agent-facing guidance.

- `manifest.json` exposes searchable metadata for marketplaces and tooling.

- `plugin.json` provides Copilot CLI plugin metadata for installation.

## License

MIT.
