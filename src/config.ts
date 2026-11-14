import type { SomeCompanionConfigField } from '@companion-module/base'

export const DEFAULT_CONFIG: DeviceConfig = { pollInterval: 3 }

export const MIN_POLL_INTERVAL = 1
// Must stay well below setInterval's 2^31-1 ms limit, beyond which Node fires every 1 ms
export const MAX_POLL_INTERVAL = 3600

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

export function GetConfigFields(activeDeviceId: string | null | undefined): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'Setup Information',
			value: '<strong>PLEASE READ THE HELP FILE.</strong> (Question mark in the top right)',
		},
		{ type: 'textinput', id: 'clientId', width: 6, label: 'Client ID' },
		{ type: 'textinput', id: 'clientSecret', width: 6, label: 'Client Secret' },
		{
			type: 'static-text',
			id: '_redirect_info_',
			width: 12,
			label: '',
			value:
				'You may need to update the Redirect URL both here and in the spotify api settings, as the previously recommended location is no longer available.<br/>We now recommend https://bitfocus.github.io/companion-module-spotify-remote/',
		},
		{ type: 'textinput', id: 'redirectUri', width: 12, label: 'Redirect URL' },
		{ type: 'textinput', id: 'code', width: 12, label: 'Approval Code' },
		{ type: 'textinput', id: 'refreshToken', width: 12, label: 'Refresh Token' },
		{ type: 'textinput', id: 'deviceId', width: 12, label: 'Selected Playback Device ID' },
		{
			type: 'static-text',
			id: 'deviceId_current',
			width: 12,
			label: 'Active Device ID',
			value: activeDeviceId
				? `The active device ID when this panel was opened is: ${activeDeviceId}`
				: 'No device was active when this panel was opened',
		},
		{ type: 'textinput', id: 'authURL', width: 12, label: 'Auth URL' },
		{
			type: 'number',
			id: 'pollInterval',
			width: 6,
			label: 'API Poll Interval (seconds)',
			default: DEFAULT_CONFIG.pollInterval,
			min: MIN_POLL_INTERVAL,
			max: MAX_POLL_INTERVAL,
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

	// Older configs stored this from a textinput, so it may be any string
	const rawPollInterval: unknown = config.pollInterval
	const parsedPollInterval = Number(rawPollInterval)
	const pollInterval =
		Number.isFinite(parsedPollInterval) && parsedPollInterval > 0
			? Math.min(Math.max(parsedPollInterval, MIN_POLL_INTERVAL), MAX_POLL_INTERVAL)
			: DEFAULT_CONFIG.pollInterval
	if (pollInterval !== rawPollInterval) {
		config.pollInterval = pollInterval
		changed = true
	}

	return changed
}
