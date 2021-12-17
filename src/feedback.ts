import { SetRequired } from 'type-fest'
import InstanceSkel = require('../../../instance_skel')
import { CompanionFeedbacks, CompanionFeedbackBoolean } from '../../../instance_skel_types'
import { DeviceConfig } from './config'
// import { SpotifyState } from './state'

export enum FeedbackId {
	IsPlaying = 'is-playing',
	IsShuffle = 'is-shuffle',
	IsRepeat = 'is-repeat',
	ActiveDevice = 'active-device',
	CurrentContext = 'current-context',
}

type CompanionFeedbackWithCallback = SetRequired<CompanionFeedbackBoolean, 'callback'>

export function GetFeedbacksList(
	instance: InstanceSkel<DeviceConfig>,
	getState: () => any // SpotifyState
): CompanionFeedbacks {
	// const initialState = getState()
	const feedbacks: { [id in FeedbackId]: CompanionFeedbackWithCallback | undefined } = {
		[FeedbackId.IsPlaying]: {
			type: 'boolean',
			label: 'Change button colour if music is playing',
			description: 'If there is active playback, set the button to this colour',
			options: [],
			style: {
				color: instance.rgb(255, 255, 255),
				bgcolor: instance.rgb(0, 255, 0),
			},
			callback: (_feedback): boolean => getState().MusicPlaying,
		},

		[FeedbackId.IsShuffle]: {
			type: 'boolean',
			label: 'Change button colour if shuffle is turned on',
			description: 'If shuffle is enabled, set the button to this colour',
			options: [],
			style: {
				color: instance.rgb(255, 255, 255),
				bgcolor: instance.rgb(0, 255, 0),
			},
			callback: (_feedback): boolean => getState().ShuffleOn,
		},

		[FeedbackId.IsRepeat]: {
			type: 'boolean',
			label: 'Change button color based on repeat state',
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
			style: {
				color: instance.rgb(255, 255, 255),
				bgcolor: instance.rgb(0, 255, 0),
			},
			callback: (feedback): boolean => getState().RepeatState == feedback.options.type,
		},

		[FeedbackId.ActiveDevice]: {
			type: 'boolean',
			label: 'Change button colour if active device name matches value',
			description: 'If active device name matches value, change button color',
			options: [
				{
					type: 'textinput',
					label: 'Device Name (case insensitive)',
					id: 'device',
				},
			],
			style: {
				color: instance.rgb(255, 255, 255),
				bgcolor: instance.rgb(0, 255, 0),
			},
			callback: (feedback): boolean =>
				typeof feedback.options.device === 'string' &&
				getState().ActiveDevice?.toLowerCase() == feedback.options.device.toLowerCase(),
		},

		[FeedbackId.CurrentContext]: {
			type: 'boolean',
			label: 'Change button colour if current album/artist/playlist id matches value',
			description: 'If active album/artist/playlist matches value, change button color',
			options: [
				{
					type: 'textinput',
					label: 'Item ID',
					id: 'id',
				},
			],
			style: {
				color: instance.rgb(255, 255, 255),
				bgcolor: instance.rgb(0, 255, 0),
			},
			callback: (feedback): boolean => getState().CurrentContext == feedback.options.id,
		},
	}

	return feedbacks
}
