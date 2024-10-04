import type { SomeCompanionConfigField } from '@companion-module/base'

export const DEFAULT_CONFIG: DeviceConfig = {
	pollInterval: 3,
}

export interface DeviceConfig {
	clientId?: string
	clientSecret?: string
	redirectUri?: string
	code?: string
	refreshToken?: string
	deviceId?: string
	authURL?: string
	pollInterval: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'Setup Information',
			value: '<strong>PLEASE READ THE HELP FILE.</strong> (Question mark in the top right)',
		},
		{
			type: 'textinput',
			id: 'clientId',
			width: 6,
			label: 'Client ID',
		},
		{
			type: 'textinput',
			id: 'clientSecret',
			width: 6,
			label: 'Client Secret',
		},
		{
			type: 'static-text',
			id: '_redirect_info_',
			width: 12,
			label: '',
			value:
				'You may need to update the Redirect URL both here and in the spotify api settings, as the previously recommended location is no longer available.<br/>We now recommend https://bitfocus.github.io/companion-module-spotify-remote/',
		},
		{
			type: 'textinput',
			id: 'redirectUri',
			width: 12,
			label: 'Redirect URL',
		},
		{
			type: 'textinput',
			id: 'code',
			width: 12,
			label: 'Approval Code',
		},
		{
			type: 'textinput',
			id: 'refreshToken',
			width: 12,
			label: 'Refresh Token',
		},
		{
			type: 'textinput',
			id: 'deviceId',
			width: 12,
			label: 'Selected Playback Device ID',
		},
		{
			type: 'textinput',
			id: 'authURL',
			width: 12,
			label: 'Auth URL',
		},
		{
			type: 'textinput',
			id: 'pollInterval',
			width: 6,
			label: 'API Poll Interval (seconds)',
		},
		{
			type: 'static-text',
			id: '_poll_info_',
			width: 6,
			label: '',
			value:
				'This is how often the module will poll the Spotify API for updates. Default is 3 seconds. This may need to be increased if reaching the api rate limit.',
		},
	]
}

export function ensureRequiredConfigIsDefined(config: DeviceConfig): boolean {
	let changed = false

	if (!config.pollInterval || config.pollInterval < 0) {
		config.pollInterval = DEFAULT_CONFIG.pollInterval
		changed = true
	}

	return changed
}
