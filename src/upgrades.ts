import { CompanionStaticUpgradeScript, CreateConvertToBooleanFeedbackUpgradeScript } from '@companion-module/base'
import { DeviceConfig } from './config.js'
import { FeedbackId } from './feedback.js'

export const UpgradeScripts: CompanionStaticUpgradeScript<DeviceConfig>[] = [
	// Upgrade feedbacks to boolean type
	CreateConvertToBooleanFeedbackUpgradeScript({
		[FeedbackId.IsPlaying]: true,
		[FeedbackId.IsShuffle]: true,
		[FeedbackId.IsRepeat]: true,
		[FeedbackId.ActiveDevice]: true,
		[FeedbackId.CurrentContext]: true,
	}),
]
