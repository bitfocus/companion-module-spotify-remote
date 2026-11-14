import {
	CompanionActionContext,
	CompanionActionDefinitions,
	CompanionActionDefinition,
	CompanionInputFieldTextInput,
	CompanionOptionValues,
} from '@companion-module/base'
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
import { formatApiError } from './api/util.js'

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
	SeekPositionBack = 'seekPositionBack',
	SeekPositionForward = 'seekPositionForward',
	Skip = 'skip',
	Previous = 'previous',
	ShuffleToggle = 'shuffleToggle',
	ShuffleOn = 'shuffleOn',
	ShuffleOff = 'shuffleOff',
	RepeatState = 'repeatState',
	ActiveDeviceToConfig = 'activeDeviceToConfig',
	SwitchActiveDevice = 'switchActiveDevice',
	Mute = 'mute',
	Unmute = 'unmute',
	MuteToggle = 'muteToggle',
}

export type DoAction = (instance: SpotifyInstanceBase, deviceId: string | null) => Promise<void>

// Number fields can't take variables in module API 1.x, so volumes are text inputs parsed at runtime
function volumeInput(
	id: string,
	label: string,
	defaultValue: number,
	isVisible?: CompanionInputFieldTextInput['isVisible'],
): CompanionInputFieldTextInput {
	return {
		type: 'textinput',
		label,
		id,
		default: String(defaultValue),
		tooltip: 'A number from 0 to 100, or a variable such as $(custom:volume)',
		useVariables: true,
		isVisible,
	}
}

async function parseVolume(context: CompanionActionContext, value: CompanionOptionValues[string]): Promise<number> {
	const text = (await context.parseVariablesInString(String(value ?? ''))).trim()
	return text === '' ? NaN : Number(text)
}

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
				volumeInput('startVolume', 'Start Volume for Fade In', 0, (options) => options.fadeIn === true),
				volumeInput('targetVolume', 'Target Volume for Fade In', 85, (options) => options.fadeIn === true),
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
			callback: async (action, context) => {
				await executeActionIfHasDeviceId('play/pause', async (instance, deviceId) => {
					ChangePlayState(
						instance,
						deviceId,
						'toggle',
						action.options.fadeOut as boolean,
						action.options.fadeIn as boolean,
						await parseVolume(context, action.options.startVolume),
						await parseVolume(context, action.options.targetVolume),
						Number(action.options.fadeDurationMs),
					).catch((err) => instance.log('warn', `Play Toggle failed: ${formatApiError(err)}`))
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
				volumeInput('startVolume', 'Start Volume', 0, (options) => options.fadeIn === true),
				volumeInput('targetVolume', 'Target Volume', 85, (options) => options.fadeIn === true),
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
				await executeActionIfHasDeviceId('play', async (instance, deviceId) => {
					ChangePlayState(
						instance,
						deviceId,
						'play',
						false,
						action.options.fadeIn as boolean,
						await parseVolume(context, action.options.startVolume),
						await parseVolume(context, action.options.targetVolume),
						Number(action.options.fadeDurationMs),
					).catch((err) => instance.log('warn', `Play failed: ${formatApiError(err)}`))
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
				volumeInput('startVolume', 'Start Volume', 0, (options) => options.fadeIn === true),
				volumeInput('targetVolume', 'Target Volume', 85, (options) => options.fadeIn === true),
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
							await parseVolume(context, action.options.startVolume),
							await parseVolume(context, action.options.targetVolume),
							Number(action.options.fadeDurationMs),
						).catch((err) => instance.log('warn', `PlaySpecificList failed: ${formatApiError(err)}`))
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
				volumeInput('startVolume', 'Start Volume', 0, (options) => options.fadeIn === true),
				volumeInput('targetVolume', 'Target Volume', 85, (options) => options.fadeIn === true),
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
							await parseVolume(context, action.options.startVolume),
							await parseVolume(context, action.options.targetVolume),
							Number(action.options.fadeDurationMs),
						).catch((err) => instance.log('warn', `PlaySpecificTracks failed: ${formatApiError(err)}`))
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
					isVisible: (options) => options.fadeOut === true,
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
						Number(action.options.fadeDurationMs),
					).catch((err) => instance.log('warn', `Pause failed: ${formatApiError(err)}`))
				})
			},
		},
		[ActionId.VolumeUp]: {
			name: 'Volume Up',
			options: [volumeInput('volumeUpAmount', 'Volume', 5)],
			callback: async (action, context) => {
				await executeActionIfHasDeviceId('volume up', async (instance, deviceId) => {
					await ChangeVolume(instance, deviceId, false, await parseVolume(context, action.options.volumeUpAmount))
				})
			},
		},
		[ActionId.VolumeDown]: {
			name: 'Volume Down',
			options: [volumeInput('volumeDownAmount', 'Volume', 5)],
			callback: async (action, context) => {
				await executeActionIfHasDeviceId('volume down', async (instance, deviceId) => {
					await ChangeVolume(instance, deviceId, false, -(await parseVolume(context, action.options.volumeDownAmount)))
				})
			},
		},
		[ActionId.VolumeSpecific]: {
			name: 'Set Volume to Specific Value',
			options: [volumeInput('value', 'Volume', 50)],
			callback: async (action, context) => {
				await executeActionIfHasDeviceId('volume', async (instance, deviceId) => {
					await ChangeVolume(instance, deviceId, true, await parseVolume(context, action.options.value))
				})
			},
		},
		[ActionId.FadeVolume]: {
			name: 'Fade Volume',
			options: [
				volumeInput('targetVolume', 'Target Volume', 50),
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
			callback: async (action, context) => {
				await executeActionIfHasDeviceId('fade volume', async (instance, deviceId) => {
					FadeVolume(
						instance,
						deviceId,
						await parseVolume(context, action.options.targetVolume),
						Number(action.options.fadeDurationMs),
					).catch((err) => instance.log('warn', `FadeVolume failed: ${formatApiError(err)}`))
				})
			},
		},
		[ActionId.SeekPositionBack]: {
			name: 'Go Backwards X Milliseconds In Currently Playing Track',
			options: [{ type: 'textinput', label: 'Position (milliseconds)', id: 'position', default: '' }],
			callback: async (action) => {
				const positionMs = Number(action.options.position)
				if (!isNaN(positionMs)) {
					await executeActionIfHasDeviceId('seek', async (instance, deviceId) => {
						const currentPositionVariable = instance.getVariableValue('songProgressSeconds')
						const currentPosition = !isNaN(Number(currentPositionVariable)) ? Number(currentPositionVariable) * 1000 : 0
						const seekToPosition = Math.max(0, currentPosition - positionMs)
						await SeekPosition(instance, deviceId, seekToPosition)
					})
				}
			},
		},
		[ActionId.SeekPositionForward]: {
			name: 'Go Forward X Milliseconds In Currently Playing Track',
			options: [{ type: 'textinput', label: 'Position (milliseconds)', id: 'position', default: '' }],
			callback: async (action) => {
				const positionMs = Number(action.options.position)
				if (!isNaN(positionMs)) {
					await executeActionIfHasDeviceId('seek', async (instance, deviceId) => {
						const currentPositionVariable = instance.getVariableValue('songProgressSeconds')
						const currentPosition = !isNaN(Number(currentPositionVariable)) ? Number(currentPositionVariable) * 1000 : 0
						const seekToPosition = Math.max(0, currentPosition + positionMs)
						await SeekPosition(instance, deviceId, seekToPosition)
					})
				}
			},
		},
		[ActionId.SeekPosition]: {
			name: 'Seek To Position In Currently Playing Track',
			options: [{ type: 'textinput', label: 'Position (milliseconds)', id: 'position', default: '' }],
			callback: async (action) => {
				const positionMs = Number(action.options.position)
				if (!isNaN(positionMs)) {
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
		[ActionId.Mute]: {
			name: 'Mute Volume',
			description: 'Mute the volume, saving the current volume to restore on unmute',
			options: [],
			callback: async () => {
				await executeActionIfHasDeviceId('mute', async (instance, deviceId) => {
					const currentVolume = Number(instance.getVariableValue('volume'))
					instance.premuteVolume = !isNaN(currentVolume) ? currentVolume : instance.premuteVolume
					instance.setVariableValues({ premuteVolume: instance.premuteVolume })
					await ChangeVolume(instance, deviceId, true, 0)
				})
			},
		},
		[ActionId.Unmute]: {
			name: 'Unmute Volume',
			description: 'Unmute the volume, restoring the volume to the value before mute',
			options: [],
			callback: async () => {
				await executeActionIfHasDeviceId('unmute', async (instance, deviceId) => {
					const premuteVolume = instance.premuteVolume
					await ChangeVolume(instance, deviceId, true, premuteVolume)
				})
			},
		},
		[ActionId.MuteToggle]: {
			name: 'Toggle Mute Volume',
			description: 'Toggle mute/unmute the volume, saving/restoring the current volume',
			options: [],
			callback: async () => {
				await executeActionIfHasDeviceId('mute toggle', async (instance, deviceId) => {
					const currentVolume = Number(instance.getVariableValue('volume'))
					if (!isNaN(currentVolume) && currentVolume > 0) {
						instance.premuteVolume = currentVolume
						instance.setVariableValues({ premuteVolume: instance.premuteVolume })
						await ChangeVolume(instance, deviceId, true, 0)
					} else {
						await ChangeVolume(instance, deviceId, true, instance.premuteVolume)
					}
				})
			},
		},
	}

	return actions
}
