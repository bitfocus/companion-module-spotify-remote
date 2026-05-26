import { CompanionStaticUpgradeScript, CreateConvertToBooleanFeedbackUpgradeScript } from '@companion-module/base'
import { DeviceConfig } from './config.js'
import { FeedbackId } from './feedback.js'
import { ActionId } from './actions.js'

const FADE_IN_ACTION_IDS = new Set<string>([
	ActionId.Play,
	ActionId.PlaySpecificList,
	ActionId.PlaySpecificTracks,
	ActionId.Pause,
	ActionId.PlayPause,
])

const AddFadeInOptionsUpgradeScript: CompanionStaticUpgradeScript<DeviceConfig> = (_context, props) => {
	const updatedActions: typeof props.actions = []

	for (const action of props.actions) {
		if (!FADE_IN_ACTION_IDS.has(action.actionId)) continue

		let changed = false
		if (!('fadeOut' in action.options)) {
			action.options['fadeOut'] = false
			changed = true
		}
		if (!('fadeIn' in action.options)) {
			action.options['fadeIn'] = false
			changed = true
		}
		if (!('startVolume' in action.options)) {
			action.options['startVolume'] = 0
			changed = true
		}
		if (!('targetVolume' in action.options)) {
			action.options['targetVolume'] = 85
			changed = true
		}
		if (!('fadeDurationMs' in action.options)) {
			action.options['fadeDurationMs'] = 5000
			changed = true
		}

		if (changed) updatedActions.push(action)
	}

	return { updatedActions, updatedFeedbacks: [], updatedConfig: null }
}

export const UpgradeScripts: CompanionStaticUpgradeScript<DeviceConfig>[] = [
	// Upgrade feedbacks to boolean type
	CreateConvertToBooleanFeedbackUpgradeScript({
		[FeedbackId.IsPlaying]: true,
		[FeedbackId.IsShuffle]: true,
		[FeedbackId.IsRepeat]: true,
		[FeedbackId.ActiveDevice]: true,
		[FeedbackId.CurrentContext]: true,
	}),
	AddFadeInOptionsUpgradeScript,
]
