import { CompanionActionDefinitions, CompanionActionDefinition } from '@companion-module/base'
import { SpotifyInstanceBase } from './types.js'
import {
	ChangePlayState,
	ChangeRepeatState,
	ChangeShuffleState,
	ChangeVolume,
	FadeVolume,
	PlaySpecificList,
	PlaySpecificTracks,
	PreviousSong,
	QueueItem,
	SeekPosition,
	SkipSong,
	TransferPlayback,
} from './helpers.js'
import { getMyDevices } from './api/device.js'

export enum ActionId {
	PlayPause = 'play/pause',
	Play = 'play',
	PlaySpecificList = 'playSpecificList',
	PlaySpecificTracks = 'playSpecificTracks',
	Pause = 'pause',
	QueueItem = 'queueItem',
	VolumeUp = 'volumeUp',
	VolumeDown = 'volumeDown',
	VolumeSpecific = 'volumeSpecific',
	FadeVolume = 'fadeVolume',
	SeekPosition = 'seekPosition',
	Skip = 'skip',
	Previous = 'previous',
	ShuffleToggle = 'shuffleToggle',
	ShuffleOn = 'shuffleOn',
	ShuffleOff = 'shuffleOff',
	RepeatState = 'repeatState',
	ActiveDeviceToConfig = 'activeDeviceToConfig',
	SwitchActiveDevice = 'switchActiveDevice',
}

export type DoAction = (instance: SpotifyInstanceBase, deviceId: string | null) => Promise<void>

export function GetActionsList(executeAction: (fcn: DoAction) => Promise<void>): CompanionActionDefinitions {
	const executeActionIfHasDeviceId = async (
		actionName: string,
		action: (instance: SpotifyInstanceBase, deviceId: string) => Promise<void>,
	) => {
		return executeAction(async (instance, deviceId) => {
			if (!deviceId) {
				instance.log('warn', `Skipping "${actionName}" action, no deviceId is configured`)
				return
			}

			await action(instance, deviceId)
		})
	}

	// getState: () => SpotifyState
	// const initialState = getState()
	const actions: { [id in ActionId]: CompanionActionDefinition | undefined } = {
		[ActionId.PlayPause]: {
			name: 'Toggle Play/Pause',
			options: [
				{
					type: 'checkbox',
					label: 'Fade Out Volume on Pause',
					id: 'fadeOut',
					default: false,
				},
				{
					type: 'checkbox',
					label: 'Fade In Volume on Play',
					id: 'fadeIn',
					default: false,
				},
				{
					type: 'number',
					label: 'Start Volume for Fade In',
					id: 'startVolume',
					default: 0,
					min: 0,
					max: 100,
					step: 1,
					isVisible: (options) => options.fadeIn === true,
				},
				{
					type: 'number',
					label: 'Target Volume for Fade In',
					id: 'targetVolume',
					default: 85,
					min: 0,
					max: 100,
					step: 1,
					isVisible: (options) => options.fadeIn === true,
				},
				{
					type: 'number',
					label: 'Fade Duration (milliseconds)',
					id: 'fadeDurationMs',
					default: 5000,
					min: 500,
					max: 300000,
					step: 500,
					isVisible: (options) => options.fadeIn === true || options.fadeOut === true,
				},
			],
			callback: async (action) => {
				await executeActionIfHasDeviceId('play/pause', async (instance, deviceId) => {
					ChangePlayState(
						instance,
						deviceId,
						'toggle',
						action.options.fadeOut as boolean,
						action.options.fadeIn as boolean,
						Number(action.options.startVolume),
						Number(action.options.targetVolume),
						Number(action.options.fadeDurationMs),
					).catch((err) => instance.log('warn', `Play Toggle failed: ${err}`))
				})
			},
		},
		[ActionId.Play]: {
			name: 'Play',
			options: [
				{
					type: 'checkbox',
					label: 'Fade In Volume',
					id: 'fadeIn',
					default: false,
				},
				{
					type: 'number',
					label: 'Start Volume',
					id: 'startVolume',
					default: 0,
					min: 0,
					max: 100,
					step: 1,
					isVisible: (options) => options.fadeIn === true,
				},
				{
					type: 'number',
					label: 'Target Volume',
					id: 'targetVolume',
					default: 85,
					min: 0,
					max: 100,
					step: 1,
					isVisible: (options) => options.fadeIn === true,
				},
				{
					type: 'number',
					label: 'Fade Duration (milliseconds)',
					id: 'fadeDurationMs',
					default: 5000,
					min: 500,
					max: 300000,
					step: 500,
					isVisible: (options) => options.fadeIn === true,
				},
			],
			callback: async (action) => {
				await executeActionIfHasDeviceId('play', async (instance, deviceId) => {
					ChangePlayState(
						instance,
						deviceId,
						'play',
						false,
						action.options.fadeIn as boolean,
						Number(action.options.startVolume),
						Number(action.options.targetVolume),
						Number(action.options.fadeDurationMs),
					).catch((err) => instance.log('warn', `Play failed: ${err}`))
				})
			},
		},
		[ActionId.PlaySpecificList]: {
			name: 'Start Specific Album / Artist / Playlist',
			options: [
				{
					id: 'type',
					type: 'dropdown',
					label: 'Type',
					choices: [
						{ id: 'album', label: 'Album' },
						{ id: 'artist', label: 'Artist' },
						{ id: 'playlist', label: 'Playlist' },
					],
					default: 'album',
				},
				{
					tooltip: 'Provide the ID for the item',
					required: true,
					type: 'textinput',
					label: 'Item ID',
					id: 'context_uri',
					useVariables: true,
				},
				{
					type: 'dropdown',
					default: 'return',
					label: 'Action Behavior if Provided Item is Currently Playing',
					id: 'behavior',
					choices: [
						{ id: 'return', label: 'Do Nothing' },
						{ id: 'resume', label: 'Play (if paused)' },
						{ id: 'force', label: 'Force Play (from start)' },
					],
				},
				{
					type: 'checkbox',
					label: 'Fade In Volume',
					id: 'fadeIn',
					default: false,
				},
				{
					type: 'number',
					label: 'Start Volume',
					id: 'startVolume',
					default: 0,
					min: 0,
					max: 100,
					step: 1,
					isVisible: (options) => options.fadeIn === true,
				},
				{
					type: 'number',
					label: 'Target Volume',
					id: 'targetVolume',
					default: 85,
					min: 0,
					max: 100,
					step: 1,
					isVisible: (options) => options.fadeIn === true,
				},
				{
					type: 'number',
					label: 'Fade Duration (milliseconds)',
					id: 'fadeDurationMs',
					default: 5000,
					min: 500,
					max: 300000,
					step: 500,
					isVisible: (options) => options.fadeIn === true,
				},
			],
			callback: async (action, context) => {
				if (action.options.type && action.options.context_uri && typeof action.options.behavior === 'string') {
					const behavior = action.options.behavior as any // TODO - type

					await executeActionIfHasDeviceId('start album/artist/playlist', async (instance, deviceId) => {
						const context_uri_portion = await context.parseVariablesInString(String(action.options.context_uri))
						const context_uri = context_uri_portion.startsWith('spotify:')
							? context_uri_portion
							: `spotify:${action.options.type}:${context_uri_portion}`

						PlaySpecificList(
							instance,
							deviceId,
							context_uri,
							behavior,
							action.options.fadeIn as boolean,
							Number(action.options.startVolume),
							Number(action.options.targetVolume),
							Number(action.options.fadeDurationMs),
						).catch((err) => instance.log('warn', `PlaySpecificList failed: ${err}`))
					})
				}
			},
		},
		[ActionId.PlaySpecificTracks]: {
			name: 'Start Specific Track(s)',
			options: [
				{
					id: 'tracks',
					type: 'textinput',
					required: true,
					label: 'Input Specific Track IDs',
					tooltip: 'IDs should be comma separated (ie. 4ByEFOBuLXpCqvO1kw8Wdm,7BaEFOBuLXpDqvO1kw8Wem)',
				},
				{
					id: 'positionMs',
					type: 'number',
					label: 'Start Position of First Track in Milliseconds',
					default: 0,
					required: false,
					min: 0,
					max: 1000000,
				},
				{
					type: 'checkbox',
					label: 'Fade In Volume',
					id: 'fadeIn',
					default: false,
				},
				{
					type: 'number',
					label: 'Start Volume',
					id: 'startVolume',
					default: 0,
					min: 0,
					max: 100,
					step: 1,
					isVisible: (options) => options.fadeIn === true,
				},
				{
					type: 'number',
					label: 'Target Volume',
					id: 'targetVolume',
					default: 85,
					min: 0,
					max: 100,
					step: 1,
					isVisible: (options) => options.fadeIn === true,
				},
				{
					type: 'number',
					label: 'Fade Duration (milliseconds)',
					id: 'fadeDurationMs',
					default: 5000,
					min: 500,
					max: 300000,
					step: 500,
					isVisible: (options) => options.fadeIn === true,
				},
			],
			callback: async (action) => {
				if (typeof action.options.tracks === 'string') {
					const tracks = action.options.tracks.split(',').map((track) => {
						const value = track.trim()
						return value.startsWith('spotify:track') ? value : `spotify:track:${value}`
					})

					await executeActionIfHasDeviceId('start track', async (instance, deviceId) => {
						PlaySpecificTracks(
							instance,
							deviceId,
							tracks,
							Number(action.options.positionMs) || 0,
							action.options.fadeIn as boolean,
							Number(action.options.startVolume),
							Number(action.options.targetVolume),
							Number(action.options.fadeDurationMs),
						).catch((err) => instance.log('warn', `PlaySpecificTracks failed: ${err}`))
					})
				}
			},
		},
		[ActionId.Pause]: {
			name: 'Pause Playback',
			options: [
				{
					type: 'checkbox',
					label: 'Fade Out Volume',
					id: 'fadeOut',
					default: false,
				},
				{
					type: 'number',
					label: 'Fade Duration (milliseconds)',
					id: 'fadeDurationMs',
					default: 5000,
					min: 500,
					max: 300000,
					step: 500,
					isVisible: (options) => options.fadeIn === true,
				},
			],
			callback: async (action) => {
				await executeActionIfHasDeviceId('pause', async (instance, deviceId) => {
					ChangePlayState(
						instance,
						deviceId,
						'pause',
						action.options.fadeOut as boolean,
						false,
						0,
						0,
						0,
						Number(action.options.fadeDurationMs),
					).catch((err) => instance.log('warn', `Pause failed: ${err}`))
				})
			},
		},
		[ActionId.VolumeUp]: {
			name: 'Volume Up',
			options: [{ type: 'number', label: 'Volume', id: 'volumeUpAmount', default: 5, min: 0, max: 100, step: 1 }],
			callback: async (action) => {
				await executeActionIfHasDeviceId('volume up', async (instance, deviceId) => {
					await ChangeVolume(instance, deviceId, false, Number(action.options.volumeUpAmount))
				})
			},
		},
		[ActionId.VolumeDown]: {
			name: 'Volume Down',
			options: [{ type: 'number', label: 'Volume', id: 'volumeDownAmount', default: 5, min: 0, max: 100, step: 1 }],
			callback: async (action) => {
				await executeActionIfHasDeviceId('volume down', async (instance, deviceId) => {
					await ChangeVolume(instance, deviceId, false, -Number(action.options.volumeDownAmount))
				})
			},
		},
		[ActionId.VolumeSpecific]: {
			name: 'Set Volume to Specific Value',
			options: [{ type: 'number', label: 'Volume', id: 'value', default: 50, min: 0, max: 100, step: 1 }],
			callback: async (action) => {
				await executeActionIfHasDeviceId('volume', async (instance, deviceId) => {
					await ChangeVolume(instance, deviceId, true, Number(action.options.value))
				})
			},
		},
		[ActionId.FadeVolume]: {
			name: 'Fade Volume',
			options: [
				{
					type: 'number',
					label: 'Target Volume',
					id: 'targetVolume',
					default: 50,
					min: 0,
					max: 100,
					step: 1,
				},
				{
					type: 'number',
					label: 'Fade Duration (milliseconds)',
					id: 'fadeDurationMs',
					default: 5000,
					min: 500,
					max: 300000,
					step: 500,
				},
			],
			callback: async (action) => {
				await executeActionIfHasDeviceId('fade volume', async (instance, deviceId) => {
					FadeVolume(
						instance,
						deviceId,
						Number(action.options.targetVolume),
						Number(action.options.fadeDurationMs),
					).catch((err) => instance.log('warn', `FadeVolume failed: ${err}`))
				})
			},
		},
		[ActionId.SeekPosition]: {
			name: 'Seek To Position In Currently Playing Track',
			options: [{ type: 'textinput', label: 'Position (milliseconds)', id: 'position', default: '' }],
			callback: async (action) => {
				if (typeof action.options.position === 'number') {
					const positionMs = action.options.position
					await executeActionIfHasDeviceId('seek', async (instance, deviceId) => {
						await SeekPosition(instance, deviceId, positionMs)
					})
				}
			},
		},
		[ActionId.Skip]: {
			name: 'Skip Track',
			options: [],
			callback: async () => {
				await executeActionIfHasDeviceId('skip track', async (instance, deviceId) => {
					await SkipSong(instance, deviceId)
				})
			},
		},
		[ActionId.Previous]: {
			name: 'Previous Track',
			options: [],
			callback: async () => {
				await executeActionIfHasDeviceId('previous track', async (instance, deviceId) => {
					await PreviousSong(instance, deviceId)
				})
			},
		},
		[ActionId.ShuffleToggle]: {
			name: 'Toggle Shuffle',
			options: [],
			callback: async () => {
				await executeActionIfHasDeviceId('toggle shuffle', async (instance, deviceId) => {
					await ChangeShuffleState(instance, deviceId, 'toggle')
				})
			},
		},
		[ActionId.ShuffleOn]: {
			name: 'Turn Shuffle On',
			options: [],
			callback: async () => {
				await executeActionIfHasDeviceId('shuffle on', async (instance, deviceId) => {
					await ChangeShuffleState(instance, deviceId, true)
				})
			},
		},
		[ActionId.ShuffleOff]: {
			name: 'Turn Shuffle Off',
			options: [],
			callback: async () => {
				await executeActionIfHasDeviceId('shuffle off', async (instance, deviceId) => {
					await ChangeShuffleState(instance, deviceId, false)
				})
			},
		},
		[ActionId.RepeatState]: {
			name: 'Set Repeat State',
			options: [
				{
					type: 'dropdown',
					label: 'State',
					id: 'state',
					default: 'off',
					choices: [
						{ id: 'off', label: 'off' },
						{ id: 'context', label: 'context' },
						{ id: 'track', label: 'track' },
					],
				},
			],
			callback: async (action) => {
				if (typeof action.options.state === 'string') {
					const target = action.options.state as any // TODO - typings
					await executeActionIfHasDeviceId('rpeat', async (instance, deviceId) => {
						await ChangeRepeatState(instance, deviceId, target)
					})
				}
			},
		},
		[ActionId.ActiveDeviceToConfig]: {
			name: 'Write the ID of the current Active Device to config',
			options: [],
			callback: async () => {
				await executeAction(async (instance) => {
					const reqOptions = instance.getRequestOptionsBase()
					if (!reqOptions) return

					const data = await getMyDevices(reqOptions)
					const activeDevice = data.body?.devices?.find((d) => d.is_active)
					if (activeDevice?.id) {
						// Store the id
						instance.config.deviceId = activeDevice.id
						instance.saveConfig(instance.config)

						// Invalidate all feedbacks, some of them have probably changed
						instance.checkFeedbacks()
					} else {
						instance.log('warn', 'No active device found')
					}
				})
			},
		},
		[ActionId.SwitchActiveDevice]: {
			name: 'Change Active Device',
			options: [{ type: 'textinput', label: 'Device ID', id: 'deviceId', default: '' }],
			callback: async (action) => {
				await executeAction(async (instance) => {
					const targetId = action.options.deviceId
					if (targetId && typeof targetId === 'string') {
						// Store the id
						instance.config.deviceId = targetId
						instance.saveConfig(instance.config)

						// Invalidate all feedbacks, some of them have probably changed
						instance.checkFeedbacks()

						await TransferPlayback(instance, targetId)
					}
				})
			},
		},
		[ActionId.QueueItem]: {
			name: 'Add Track to Queue',
			options: [
				{
					tooltip: 'Provide the ID for the track',
					required: true,
					type: 'textinput',
					label: 'Track ID',
					id: 'context_uri',
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				if (typeof action.options.context_uri === 'string') {
					const context_uri_portion = await context.parseVariablesInString(String(action.options.context_uri))
					const context_uri = context_uri_portion.startsWith('spotify:track')
						? context_uri_portion
						: `spotify:track:${context_uri_portion}`

					await executeActionIfHasDeviceId('queue track', async (instance, deviceId) => {
						await QueueItem(instance, deviceId, context_uri)
					})
				}
			},
		},
	}

	return actions
}
