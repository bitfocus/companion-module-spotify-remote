---
name: companion-v1-api-compliance
description: 'Checklist for reviewing Bitfocus Companion modules that use @companion-module/base v1.x, including required lifecycle methods, deprecated patterns, version-specific compliance checks, and upgrade recommendations.'
license: MIT
---

# Skill: Companion Module API v1.x Compliance

## Purpose

Reference checklist for reviewing BitFocus Companion modules on `@companion-module/base` v1.x
(Companion 3.1 through 4.2).

Covers API versions v1.5 through v1.14. For v2.0+ modules, see `companion-v2-api-compliance/SKILL.md`.

---

## Version Detection

Read `@companion-module/base` in `package.json`. Match to API version:

| Package Version | API Version | Min. Companion |
| --------------- | ----------- | -------------- |
| `^1.14.x`       | v1.14       | Companion 4.2+ |
| `^1.13.x`       | v1.13       | Companion 4.1+ |
| `^1.12.x`       | v1.12       | Companion 4.0+ |
| `^1.11.x`       | v1.11       | Companion 3.5+ |
| `^1.10.x`       | v1.10       | Companion 3.4+ |
| `^1.8.x`        | v1.8        | Companion 3.3+ |
| `^1.7.x`        | v1.7        | Companion 3.2+ |
| `^1.5.x`        | v1.5        | Companion 3.1+ |
| `<1.5.x`        | Legacy      | Companion 3.0  |

> Note: There are no documented changelog entries for v1.6 or v1.9 — these version numbers are skipped in the docs.

---

## 🔴 Required Checks — All v1.x Modules (Critical if violated)

These apply regardless of which v1.x version the module is on:

| Check               | Expected                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| Entry point         | `runEntrypoint(ModuleInstance, UpgradeScripts)` called at the **bottom** of the main file             |
| UpgradeScripts      | `const UpgradeScripts: CompanionStaticUpgradeScript<Config>[] = [...]` exported — even if empty array |
| `init()`            | Implemented; sets up the connection and any state                                                     |
| `destroy()`         | Implemented; closes ALL sockets, clears ALL timers, stops bonjour                                     |
| `configUpdated()`   | Implemented; handles runtime config changes without restart                                           |
| `getConfigFields()` | Implemented; returns the config panel fields                                                          |
| `package-lock.json` | Must NOT exist — only `yarn.lock` is allowed                                                          |
| `dist/`             | Must be gitignored — never committed                                                                  |

---

## 🟠 Deprecated Patterns — Flag as High

These are deprecated and will break in a future release. Flag them on any module at or above the "deprecated since" version.

| Deprecated Pattern                                                         | Deprecated Since | Replacement                                               |
| -------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------- |
| `isVisible: (options) => boolean` on option fields                         | v1.12            | `isVisibleExpression: "expression string"`                |
| `self.parseVariablesInString()` on a `textinput` field with `useVariables` | v1.13            | Auto-parsed — the call is a no-op; remove it              |
| Custom feedback invert option that duplicates Companion's built-in invert  | v1.5             | Remove custom option; run upgrade script to migrate value |

---

## Per-Version Compliance Checks

Apply checks for the module's version AND all versions below it (a v1.13 module should be checked against v1.5 through v1.13).

---

### API v1.5 (Companion 3.1+)

**Boolean feedback auto-invert:**

- Companion automatically adds an "Invert" option to all boolean feedbacks
- ⚠️ If the module has its **own** custom invert option that duplicates Companion's: flag as 🟡 Medium
  - Fix: use an upgrade script to migrate the custom value into Companion's built-in invert field, then remove the option

---

### API v1.7 (Companion 3.2+)

**Bonjour/mDNS device discovery:**

- A `bonjour-device` config field type is now available for devices that support mDNS
- ⚠️ If the device supports mDNS/Bonjour but the module uses a manual IP text field: flag as 💡 Nice to Have

**Color fields:**

- `color` input fields can now accept `#000000` hex string format and support alpha channels
- No action required unless the module has workarounds for hex color input

---

### API v1.8 (Companion 3.3+)

**Local/button-scoped variables (`$(this:*)` and `$(local:*)`):**

- If the module's action/feedback callbacks use variables, check how `parseVariablesInString` is called:
  - ✅ Correct: `context.parseVariablesInString(str)` using the **second callback parameter** (`context`)
  - ❌ Wrong: `self.parseVariablesInString(str)` — `$(this:*)` and `$(local:*)` variables will NOT resolve correctly
- If using `context.parseVariablesInString`, the option field MUST declare `useVariables: { local: true }` to signal support to Companion's UI
- Calling `self.parseVariablesInString()` instead of `context.parseVariablesInString()` for local variable fields: flag as 🟡 Medium

**Shared UDP listeners:**

- If the module opens a UDP port that might conflict (hardcoded well-known port), and multiple connections could be added: flag as 🟡 Medium
  - Fix: use Companion's shared UDP listener utilities instead of opening the port directly

---

### API v1.10 (Companion 3.4+)

**Preset headlines:**

- Each action, feedback, and step in a preset can now have a `headline` — user-editable label shown in the preset editor
- No action required; headline is purely additive

**Bonjour array queries:**

- `companion/manifest.json` Bonjour queries can now be an array of query objects to merge results from multiple mDNS service types
- No action required unless the module would benefit from querying multiple service types for one device

**Extended `imageBuffer` formats:**

- Advanced feedbacks using `imageBuffer` can now use `imageBufferEncoding` to declare the pixel format
- `imageBufferPosition.drawScale` is available for high-DPI rendering
- ⚠️ If the module returns very large imageBuffers (e.g., full-res bitmaps): flag as 🟡 Medium (performance risk)

---

### API v1.11 (Companion 3.5+)

**Node.js 22 runtime:**

- Node 22 is now available; Node 18 remains supported but Node 22 is recommended
- ⚠️ If `companion/manifest.json` explicitly specifies `"type": "node18"`: flag as 💡 Nice to Have
  - Recommend updating to `"type": "node22"` for security patches

---

### API v1.12 (Companion 4.0+)

**Module permissions in `companion/manifest.json`:**

As of v1.12, modules run with Node.js permissions model enabled. If the module uses any of these APIs, the corresponding permission MUST be declared in the manifest's `permissions` object:

| API Used              | Required Permission |
| --------------------- | ------------------- |
| `worker_threads`      | `"worker-threads"`  |
| `child_process`       | `"child-process"`   |
| Native C/C++ addons   | `"native-addons"`   |
| Filesystem read/write | `"filesystem"`      |

- ⚠️ Using these APIs WITHOUT declaring the permission: flag as 🟠 High — module will fail to run in Companion 4.0+

Example manifest:

```json
{
	"permissions": {
		"worker-threads": true,
		"filesystem": true
	}
}
```

**`isVisible` function deprecation:**

- Option fields using `isVisible: (options) => boolean` are deprecated in favor of `isVisibleExpression`
- ⚠️ Any use of the `isVisible` function form: flag as 🟡 Medium

**Bonjour port-based filtering:**

- Bonjour queries in the manifest can now filter by port number — useful when multiple device types share the same mDNS service type
- No action required unless the module could benefit from port filtering

**Escape character utilities:**

- `parseEscapeCharacters` and `substituteEscapeCharacters` are now available as SDK utilities
- ⚠️ If the module manually implements escape character handling: flag as 💡 Nice to Have

---

### API v1.13 (Companion 4.1+)

**Auto variable parsing in `textinput` fields:**

- Variables in `textinput` fields with `useVariables` defined are now **automatically parsed before the callback runs**
- `event.options.myField` will already contain the resolved value
- ⚠️ Any callback that calls `self.parseVariablesInString(event.options.someTextField)` where `someTextField` has `useVariables`: flag as 🟡 Medium
  - The call is now a no-op and should be removed to avoid confusion
  - Note: `context.parseVariablesInString()` for `$(local:*)` / `$(this:*)` variables is still needed

**Value-type feedbacks:**

- New `value` feedback type returns any value type (not just boolean)
- No action required; purely additive

**Option field improvements:**

- `description` field on any option: shows persistent hint below the input
- `textinput` fields can now be multiline with `\n` for line breaks
- `number` fields can opt into "infinity" display for audio mixer dB values
- ⚠️ Config fields for passwords, API keys, tokens, or credentials using `text` type: flag as 💡 Nice to Have — should use `secret-text` to protect values in exports

**Action subscribe/unsubscribe:**

- Actions can now specify `optionsToIgnoreForSubscribe` to filter noisy option changes from triggering subscribe/unsubscribe
- Feedback `subscribe`/`unsubscribe` is no longer called for every options change
- ⚠️ If module feedback subscribe does expensive setup on every call (assuming infrequent calls): behavior may have changed — review

---

### API v1.14 (Companion 4.2+)

**Automated config layout:**

- The config panel now uses a consistent automated layout by default in v1.14+
- Modules using custom layout positioning may need their config panel reviewed for visual correctness
- Temporary opt-out: `this.instanceOptions.disableNewConfigLayout = true` in the constructor
- ⚠️ If the module uses this opt-out: flag as 🟡 Medium — it's a temporary escape hatch that will be removed in a future release

---

## 🔮 Upgrade Recommendations (Next Release suggestions)

Use these as "🔮 Next Release" section content in review files:

| Current Version | Suggested Upgrade | Key Benefit                                                                  |
| --------------- | ----------------- | ---------------------------------------------------------------------------- |
| v1.5–v1.11      | → v1.12           | Node.js permissions model; `isVisibleExpression`                             |
| v1.5–v1.12      | → v1.13           | Auto variable parsing; `secret-text`; value feedbacks                        |
| v1.5–v1.13      | → v1.14           | Automated config layout consistency                                          |
| Any v1.x        | → v2.0            | Expression support, full API modernization, Node 22 required (drops Node 18) |

> Note: v2.0 has breaking changes — see `companion-v2-api-compliance/SKILL.md` before recommending it.

---

## References

- [API 1.5](https://companion.free/for-developers/module-development/api-changes/v1.5) — Companion 3.1+
- [API 1.7](https://companion.free/for-developers/module-development/api-changes/v1.7) — Companion 3.2+
- [API 1.8](https://companion.free/for-developers/module-development/api-changes/v1.8) — Companion 3.3+
- [API 1.10](https://companion.free/for-developers/module-development/api-changes/v1.10) — Companion 3.4+
- [API 1.11](https://companion.free/for-developers/module-development/api-changes/v1.11) — Companion 3.5+
- [API 1.12](https://companion.free/for-developers/module-development/api-changes/v1.12) — Companion 4.0+
- [API 1.13](https://companion.free/for-developers/module-development/api-changes/v1.13) — Companion 4.1+
- [API 1.14](https://companion.free/for-developers/module-development/api-changes/v1.14) — Companion 4.2+
- [API 2.0](https://companion.free/for-developers/module-development/api-changes/v2.0) — Companion 4.3+
