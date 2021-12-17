import { FeedbackId } from './feedback'

export const BooleanFeedbackUpgradeMap: {
	[id in FeedbackId]?: true
} = {
	[FeedbackId.IsPlaying]: true,
	[FeedbackId.IsShuffle]: true,
	[FeedbackId.IsRepeat]: true,
	[FeedbackId.ActiveDevice]: true,
	[FeedbackId.CurrentContext]: true,
}
