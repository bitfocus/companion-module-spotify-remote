import { SomeCompanionConfigField } from '@companion-module/base'

export interface DeviceConfig {
	clientId?: string
	clientSecret?: string
	redirectUri?: string
	code?: string
	accessToken?: string
	refreshToken?: string
	deviceId?: string
	authURL?: string
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
			width: 12,
			label: 'Client ID',
		},
		{
			type: 'textinput',
			id: 'clientSecret',
			width: 12,
			label: 'Client Secret',
		},
		{
			type: 'textinput',
			id: 'redirectUri',
			width: 12,
			label: 'Redirect URL',
			default: 'https://bitfocus.github.io/companion-oauth/callback',
		},
		{
			type: 'textinput',
			id: 'authURL',
			width: 12,
			label: 'Auth URL',
		},
		{
			type: 'textinput',
			id: 'deviceId',
			width: 12,
			label: 'Device ID',
		},
		{
			type: 'checkbox',
			id: 'managed_secrets',
			width: 12,
			label: 'Show secrets',
			default: false,
		},
		{
			type: 'textinput',
			id: 'code',
			width: 12,
			label: 'Approval Code',
			isVisible: (options) => !!options.managed_secrets,
		},
		{
			type: 'textinput',
			id: 'accessToken',
			width: 12,
			label: 'Access Token',
			isVisible: (options) => !!options.managed_secrets,
		},
		{
			type: 'textinput',
			id: 'refreshToken',
			width: 12,
			label: 'Refresh Token',
			isVisible: (options) => !!options.managed_secrets,
		},
	]
}
