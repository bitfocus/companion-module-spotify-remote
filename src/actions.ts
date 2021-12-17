import { CompanionActions, CompanionAction } from '../../../instance_skel_types'
// import { SpotifyState } from './state'

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

export function GetActionsList(): CompanionActions {
	// getState: () => SpotifyState
	// const initialState = getState()
	const actions: { [id in ActionId]: CompanionActionWithCallback | undefined } = {
		[ActionId.PlayPause]: {
			label: 'Toggle Play/Pause',
			options: [],
			callback: () => {
				throw new Error('TODO')
			},
		},
		[ActionId.Play]: {
			label: 'Play',
			options: [],
			callback: () => {
				throw new Error('TODO')
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
				throw new Error('TODO')
			},
		},
		[ActionId.VolumeUp]: {
			label: 'Volume Up',
			options: [
				{
					type: 'textinput',
					label: 'Volume',
					id: 'volumeUpAmount',
					default: '5',
				},
			],
			callback: () => {
				throw new Error('TODO')
			},
		},
		[ActionId.VolumeDown]: {
			label: 'Volume Down',
			options: [
				{
					type: 'textinput',
					label: 'Volume',
					id: 'volumeDownAmount',
					default: '5',
				},
			],
			callback: () => {
				throw new Error('TODO')
			},
		},
		[ActionId.VolumeSpecific]: {
			label: 'Set Volume to Specific Value',
			options: [
				{
					type: 'textinput',
					label: 'Volume',
					id: 'value',
					default: '50',
				},
			],
			callback: () => {
				throw new Error('TODO')
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
				throw new Error('TODO')
			},
		},
		[ActionId.Previous]: {
			label: 'Previous Track',
			options: [],
			callback: () => {
				throw new Error('TODO')
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
			callback: () => {
				throw new Error('TODO')
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
