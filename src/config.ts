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
		},
		{
			type: 'textinput',
			id: 'code',
			width: 12,
			label: 'Approval Code',
		},
		{
			type: 'textinput',
			id: 'accessToken',
			width: 12,
			label: 'Access Token',
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
			label: 'Device ID',
		},
		{
			type: 'textinput',
			id: 'authURL',
			width: 12,
			label: 'Auth URL',
		},
	]
}
