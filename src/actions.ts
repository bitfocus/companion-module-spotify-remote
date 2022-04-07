import { SpotifyInstanceBase } from './types'
import { CompanionActions, CompanionAction } from '../../../instance_skel_types'
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
} from './helpers'
import { getMyDevices } from './api/device'

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

type CompanionActionWithCallback = CompanionAction & Required<Pick<CompanionAction, 'callback'>>

export type DoAction = (instance: SpotifyInstanceBase, deviceId: string | null) => Promise<void>

export function GetActionsList(executeAction: (fcn: DoAction) => void): CompanionActions {
	// getState: () => SpotifyState
	// const initialState = getState()
	const actions: { [id in ActionId]: CompanionActionWithCallback | undefined } = {
		[ActionId.PlayPause]: {
			label: 'Toggle Play/Pause',
			options: [],
			callback: () => {
				executeAction(async (instance, deviceId) => {
					if (deviceId) await ChangePlayState(instance, deviceId, 'toggle')
				})
			},
		},
		[ActionId.Play]: {
			label: 'Play',
			options: [],
			callback: () => {
				executeAction(async (instance, deviceId) => {
					if (deviceId) await ChangePlayState(instance, deviceId, 'play')
				})
			},
		},
		[ActionId.PlaySpecificList]: {
			label: 'Start Specific Album / Artist / Playlist',
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
			callback: (action) => {
				if (action.options.type && action.options.context_uri && typeof action.options.behavior === 'string') {
					const behavior = action.options.behavior as any // TODO - type
					const context_uri = `spotify:${action.options.type}:${action.options.context_uri}`

					executeAction(async (instance, deviceId) => {
						if (deviceId) await PlaySpecificList(instance, deviceId, context_uri, behavior)
					})
				}
			},
		},
		[ActionId.PlaySpecificTracks]: {
			label: 'Start Specific Track(s)',
			options: [
				{
					id: 'tracks',
					type: 'textinput',
					required: true,
					label: 'Input Specific Track IDs',
					tooltip: 'IDs should be comma separated (ie. 4ByEFOBuLXpCqvO1kw8Wdm,7BaEFOBuLXpDqvO1kw8Wem)',
				},
			],
			callback: (action) => {
				if (typeof action.options.tracks === 'string') {
					const tracks = action.options.tracks.split(',').map((track) => 'spotify:track:' + track.trim())

					executeAction(async (instance, deviceId) => {
						if (deviceId) await PlaySpecificTracks(instance, deviceId, tracks)
					})
				}
			},
		},
		[ActionId.Pause]: {
			label: 'Pause Playback',
			options: [],
			callback: () => {
				executeAction(async (instance, deviceId) => {
					if (deviceId) await ChangePlayState(instance, deviceId, 'pause')
				})
			},
		},
		[ActionId.VolumeUp]: {
			label: 'Volume Up',
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
			callback: (action) => {
				executeAction(async (instance, deviceId) => {
					if (deviceId) await ChangeVolume(instance, deviceId, false, Number(action.options.volumeUpAmount))
				})
			},
		},
		[ActionId.VolumeDown]: {
			label: 'Volume Down',
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
			callback: (action) => {
				executeAction(async (instance, deviceId) => {
					if (deviceId) await ChangeVolume(instance, deviceId, false, -Number(action.options.volumeDownAmount))
				})
			},
		},
		[ActionId.VolumeSpecific]: {
			label: 'Set Volume to Specific Value',
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
			callback: (action) => {
				executeAction(async (instance, deviceId) => {
					if (deviceId) await ChangeVolume(instance, deviceId, true, Number(action.options.value))
				})
			},
		},
		[ActionId.SeekPosition]: {
			label: 'Seek To Position In Currently Playing Track',
			options: [
				{
					type: 'textinput',
					label: 'Position (milliseconds)',
					id: 'position',
					default: '',
				},
			],
			callback: (action) => {
				if (typeof action.options.position === 'number') {
					const positionMs = action.options.position
					executeAction(async (instance, deviceId) => {
						if (deviceId) await SeekPosition(instance, deviceId, positionMs)
					})
				}
			},
		},
		[ActionId.Skip]: {
			label: 'Skip Track',
			options: [],
			callback: () => {
				executeAction(async (instance, deviceId) => {
					if (deviceId) await SkipSong(instance, deviceId)
				})
			},
		},
		[ActionId.Previous]: {
			label: 'Previous Track',
			options: [],
			callback: () => {
				executeAction(async (instance, deviceId) => {
					if (deviceId) await PreviousSong(instance, deviceId)
				})
			},
		},
		[ActionId.ShuffleToggle]: {
			label: 'Toggle Shuffle',
			options: [],
			callback: () => {
				executeAction(async (instance, deviceId) => {
					if (deviceId) await ChangeShuffleState(instance, deviceId, 'toggle')
				})
			},
		},
		[ActionId.ShuffleOn]: {
			label: 'Turn Shuffle On',
			options: [],
			callback: () => {
				executeAction(async (instance, deviceId) => {
					if (deviceId) await ChangeShuffleState(instance, deviceId, true)
				})
			},
		},
		[ActionId.ShuffleOff]: {
			label: 'Turn Shuffle Off',
			options: [],
			callback: () => {
				executeAction(async (instance, deviceId) => {
					if (deviceId) await ChangeShuffleState(instance, deviceId, false)
				})
			},
		},
		[ActionId.RepeatState]: {
			label: 'Set Repeat State',
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
			callback: (action) => {
				if (typeof action.options.state === 'string') {
					const target = action.options.state as any // TODO - typings
					executeAction(async (instance, deviceId) => {
						if (deviceId) await ChangeRepeatState(instance, deviceId, target)
					})
				}
			},
		},
		[ActionId.ActiveDeviceToConfig]: {
			label: 'Write the ID of the current Active Device to config',
			options: [],
			callback: () => {
				executeAction(async (instance) => {
					const reqOptions = instance.getRequestOptionsBase()
					if (!reqOptions) return

					const data = await getMyDevices(reqOptions)
					const activeDevice = data.body?.devices?.find((d) => d.is_active)
					if (activeDevice?.id) {
						// Store the id
						instance.config.deviceId = activeDevice.id
						instance.saveConfig()

						// Invalidate all feedbacks, some of them have probably changed
						instance.checkFeedbacks()
					}
				})
			},
		},
		[ActionId.SwitchActiveDevice]: {
			label: 'Change Active Device',
			options: [
				{
					type: 'textinput',
					label: 'Device ID',
					id: 'deviceId',
					default: '',
				},
			],
			callback: (action) => {
				executeAction(async (instance) => {
					const targetId = action.options.deviceId
					if (targetId && typeof targetId === 'string') {
						// Store the id
						instance.config.deviceId = targetId
						instance.saveConfig()

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
