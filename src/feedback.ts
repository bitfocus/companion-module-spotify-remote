import { CompanionFeedbackDefinitions, CompanionFeedbackDefinition } from '@companion-module/base'
import { SpotifyState } from './state.js'

export enum FeedbackId {
	IsPlaying = 'is-playing',
	IsShuffle = 'is-shuffle',
	IsRepeat = 'is-repeat',
	ActiveDevice = 'active-device',
	CurrentContext = 'current-context',
}

export function GetFeedbacksList(getState: () => SpotifyState): CompanionFeedbackDefinitions {
	const feedbacks: { [id in FeedbackId]: CompanionFeedbackDefinition | undefined } = {
		[FeedbackId.IsPlaying]: {
			type: 'boolean',
			name: 'Change button style if music is playing',
			description: 'If there is active playback, set the button to this colour',
			options: [],
			defaultStyle: {
				color: 0x000000,
				bgcolor: 0x00ff00,
			},
			callback: (_feedback): boolean => !!getState().playbackState?.isPlaying,
		},

		[FeedbackId.IsShuffle]: {
			type: 'boolean',
			name: 'Change button style if shuffle is turned on',
			description: 'If shuffle is enabled, set the button to this colour',
			options: [],
			defaultStyle: {
				color: 0x000000,
				bgcolor: 0x00ff00,
			},
			callback: (_feedback): boolean => !!getState().playbackState?.isShuffle,
		},

		[FeedbackId.IsRepeat]: {
			type: 'boolean',
			name: 'Change button style based on repeat state',
			description: 'If repeat state matches given state change button colors',
			options: [
				{
					type: 'dropdown',
					label: 'Repeat state to match',
					id: 'type',
					default: 'track',
					choices: [
						{
							label: 'off',
							id: 'off',
						},
						{
							label: 'context',
							id: 'context',
						},
						{
							label: 'track',
							id: 'track',
						},
					],
				},
			],
			defaultStyle: {
				color: 0x000000,
				bgcolor: 0x00ff00,
			},
			callback: (feedback): boolean => getState().playbackState?.repeatState == feedback.options.type,
		},

		[FeedbackId.ActiveDevice]: {
			type: 'boolean',
			name: 'Change button style if active device name matches value',
			description: 'If active device name matches value, change button color',
			options: [
				{
					type: 'textinput',
					label: 'Device Name (case insensitive)',
					id: 'device',
				},
			],
			defaultStyle: {
				color: 0x000000,
				bgcolor: 0x00ff00,
			},
			callback: (feedback): boolean =>
				typeof feedback.options.device === 'string' &&
				getState().playbackState?.deviceInfo?.name?.toLowerCase() == feedback.options.device.toLowerCase(),
		},

		[FeedbackId.CurrentContext]: {
			type: 'boolean',
			name: 'Change button style if current album/artist/playlist/track id matches value',
			description: 'If active album/artist/playlist/track matches value, change button color',
			options: [
				{
					type: 'textinput',
					label: 'Item ID',
					id: 'id',
				},
			],
			defaultStyle: {
				color: 0x000000,
				bgcolor: 0x00ff00,
			},
			callback: (feedback): boolean => getState().playbackState?.currentContext == feedback.options.id,
		},
	}

	return feedbacks
}
