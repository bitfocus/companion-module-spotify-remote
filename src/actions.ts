import { SpotifyInstanceBase } from './types'
import { CompanionActions, CompanionAction } from '../../../instance_skel_types'
import { ChangePlayState, ChangeRepeatState, ChangeVolume, PreviousSong, SkipSong } from './helpers'

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

type DoAction = (instance: SpotifyInstanceBase, deviceId: string) => Promise<void>

export function GetActionsList(executeAction: (fcn: DoAction) => void): CompanionActions {
	// getState: () => SpotifyState
	// const initialState = getState()
	const actions: { [id in ActionId]: CompanionActionWithCallback | undefined } = {
		[ActionId.PlayPause]: {
			label: 'Toggle Play/Pause',
			options: [],
			callback: () => {
				executeAction(async (instance, deviceId) => ChangePlayState(instance, deviceId, 'toggle'))
			},
		},
		[ActionId.Play]: {
			label: 'Play',
			options: [],
			callback: () => {
				executeAction(async (instance, deviceId) => ChangePlayState(instance, deviceId, 'play'))
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
			callback: () => {
				throw new Error('TODO')
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
			callback: () => {
				throw new Error('TODO')
			},
		},
		[ActionId.Pause]: {
			label: 'Pause Playback',
			options: [],
			callback: () => {
				executeAction(async (instance, deviceId) => ChangePlayState(instance, deviceId, 'pause'))
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
				executeAction(async (instance, deviceId) =>
					ChangeVolume(instance, deviceId, false, Number(action.options.volumeUpAmount))
				)
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
				executeAction(async (instance, deviceId) =>
					ChangeVolume(instance, deviceId, false, -Number(action.options.volumeDownAmount))
				)
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
				executeAction(async (instance, deviceId) =>
					ChangeVolume(instance, deviceId, true, Number(action.options.value))
				)
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
			callback: () => {
				throw new Error('TODO')
			},
		},
		[ActionId.Skip]: {
			label: 'Skip Track',
			options: [],
			callback: () => {
				executeAction(async (instance, deviceId) => SkipSong(instance, deviceId))
			},
		},
		[ActionId.Previous]: {
			label: 'Previous Track',
			options: [],
			callback: () => {
				executeAction(async (instance, deviceId) => PreviousSong(instance, deviceId))
			},
		},
		[ActionId.ShuffleToggle]: {
			label: 'Toggle Shuffle',
			options: [],
			callback: () => {
				throw new Error('TODO')
			},
		},
		[ActionId.ShuffleOn]: {
			label: 'Turn Shuffle On',
			options: [],
			callback: () => {
				throw new Error('TODO')
			},
		},
		[ActionId.ShuffleOff]: {
			label: 'Turn Shuffle Off',
			options: [],
			callback: () => {
				throw new Error('TODO')
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
					executeAction(async (instance, deviceId) => ChangeRepeatState(instance, deviceId, target))
				}
			},
		},
		[ActionId.ActiveDeviceToConfig]: {
			label: 'Write the ID of the current Active Device to config',
			options: [],
			callback: () => {
				throw new Error('TODO')
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
			callback: () => {
				throw new Error('TODO')
			},
		},
	}

	return actions
}
