import { CompanionActionDefinitions, CompanionActionDefinition } from '@companion-module/base'
import { SpotifyInstanceBase } from './types.js'
import {
	ChangePlayState,
	ChangeRepeatState,
	ChangeShuffleState,
	ChangeVolume,
	PlaySpecificList,
	PlaySpecificTracks,
	PreviousSong,
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
	VolumeUp = 'volumeUp',
	VolumeDown = 'volumeDown',
	VolumeSpecific = 'volumeSpecific',
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
	// getState: () => SpotifyState
	// const initialState = getState()
	const actions: { [id in ActionId]: CompanionActionDefinition | undefined } = {
		[ActionId.PlayPause]: {
			name: 'Toggle Play/Pause',
			options: [],
			callback: async () => {
				await executeAction(async (instance, deviceId) => {
					if (deviceId) await ChangePlayState(instance, deviceId, 'toggle')
				})
			},
		},
		[ActionId.Play]: {
			name: 'Play',
			options: [],
			callback: async () => {
				await executeAction(async (instance, deviceId) => {
					if (deviceId) await ChangePlayState(instance, deviceId, 'play')
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
			],
			callback: async (action, context) => {
				if (action.options.type && action.options.context_uri && typeof action.options.behavior === 'string') {
					const behavior = action.options.behavior as any // TODO - type

					await executeAction(async (instance, deviceId) => {
						if (!deviceId) return

						const context_uri_portion = await context.parseVariablesInString(String(action.options.context_uri))
						const context_uri = `spotify:${action.options.type}:${context_uri_portion}`

						await PlaySpecificList(instance, deviceId, context_uri, behavior)
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
			],
			callback: async (action) => {
				if (typeof action.options.tracks === 'string') {
					const tracks = action.options.tracks.split(',').map((track) => 'spotify:track:' + track.trim())

					await executeAction(async (instance, deviceId) => {
						if (deviceId) await PlaySpecificTracks(instance, deviceId, tracks, Number(action.options.positionMs) || 0)
					})
				}
			},
		},
		[ActionId.Pause]: {
			name: 'Pause Playback',
			options: [],
			callback: async () => {
				await executeAction(async (instance, deviceId) => {
					if (deviceId) await ChangePlayState(instance, deviceId, 'pause')
				})
			},
		},
		[ActionId.VolumeUp]: {
			name: 'Volume Up',
			options: [
				{
					type: 'number',
					label: 'Volume',
					id: 'volumeUpAmount',
					default: 5,
					min: 0,
					max: 100,
					step: 1,
				},
			],
			callback: async (action) => {
				await executeAction(async (instance, deviceId) => {
					if (deviceId) await ChangeVolume(instance, deviceId, false, Number(action.options.volumeUpAmount))
				})
			},
		},
		[ActionId.VolumeDown]: {
			name: 'Volume Down',
			options: [
				{
					type: 'number',
					label: 'Volume',
					id: 'volumeDownAmount',
					default: 5,
					min: 0,
					max: 100,
					step: 1,
				},
			],
			callback: async (action) => {
				await executeAction(async (instance, deviceId) => {
					if (deviceId) await ChangeVolume(instance, deviceId, false, -Number(action.options.volumeDownAmount))
				})
			},
		},
		[ActionId.VolumeSpecific]: {
			name: 'Set Volume to Specific Value',
			options: [
				{
					type: 'number',
					label: 'Volume',
					id: 'value',
					default: 50,
					min: 0,
					max: 100,
					step: 1,
				},
			],
			callback: async (action) => {
				await executeAction(async (instance, deviceId) => {
					if (deviceId) await ChangeVolume(instance, deviceId, true, Number(action.options.value))
				})
			},
		},
		[ActionId.SeekPosition]: {
			name: 'Seek To Position In Currently Playing Track',
			options: [
				{
					type: 'textinput',
					label: 'Position (milliseconds)',
					id: 'position',
					default: '',
				},
			],
			callback: async (action) => {
				if (typeof action.options.position === 'number') {
					const positionMs = action.options.position
					await executeAction(async (instance, deviceId) => {
						if (deviceId) await SeekPosition(instance, deviceId, positionMs)
					})
				}
			},
		},
		[ActionId.Skip]: {
			name: 'Skip Track',
			options: [],
			callback: async () => {
				await executeAction(async (instance, deviceId) => {
					if (deviceId) await SkipSong(instance, deviceId)
				})
			},
		},
		[ActionId.Previous]: {
			name: 'Previous Track',
			options: [],
			callback: async () => {
				await executeAction(async (instance, deviceId) => {
					if (deviceId) await PreviousSong(instance, deviceId)
				})
			},
		},
		[ActionId.ShuffleToggle]: {
			name: 'Toggle Shuffle',
			options: [],
			callback: async () => {
				await executeAction(async (instance, deviceId) => {
					if (deviceId) await ChangeShuffleState(instance, deviceId, 'toggle')
				})
			},
		},
		[ActionId.ShuffleOn]: {
			name: 'Turn Shuffle On',
			options: [],
			callback: async () => {
				await executeAction(async (instance, deviceId) => {
					if (deviceId) await ChangeShuffleState(instance, deviceId, true)
				})
			},
		},
		[ActionId.ShuffleOff]: {
			name: 'Turn Shuffle Off',
			options: [],
			callback: async () => {
				await executeAction(async (instance, deviceId) => {
					if (deviceId) await ChangeShuffleState(instance, deviceId, false)
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
						{
							id: 'off',
							label: 'off',
						},
						{
							id: 'context',
							label: 'context',
						},
						{
							id: 'track',
							label: 'track',
						},
					],
				},
			],
			callback: async (action) => {
				if (typeof action.options.state === 'string') {
					const target = action.options.state as any // TODO - typings
					await executeAction(async (instance, deviceId) => {
						if (deviceId) await ChangeRepeatState(instance, deviceId, target)
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
					}
				})
			},
		},
		[ActionId.SwitchActiveDevice]: {
			name: 'Change Active Device',
			options: [
				{
					type: 'textinput',
					label: 'Device ID',
					id: 'deviceId',
					default: '',
				},
			],
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
	}

	return actions
}
