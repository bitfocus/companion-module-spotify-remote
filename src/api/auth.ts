import got from 'got'
import { URL } from 'url'
import { DefaultTimeout, doRequest, SpotifyAuthUrl } from './util.js'

export interface SpotifyAuth {
	clientId: string
	clientSecret: string
	redirectUri: string
	accessToken: string
	refreshToken: string
}

export function GenerateAuthorizeUrl(
	clientId: string,
	redirectUri: string,
	scopes: string[],
	state: string | undefined
): URL {
	const url = new URL(SpotifyAuthUrl)
	url.searchParams.append('client_id', clientId)
	url.searchParams.append('response_type', 'code')
	url.searchParams.append('redirect_uri', redirectUri)
	url.searchParams.append('scope', scopes.join(' '))

	if (state) {
		url.searchParams.append('state', state)
	}

	// show_dialog: showDialog && !!showDialog

	return url
}

export interface RefreshAccessTokenResponse {
	access_token: string
	expires_in: number
	refresh_token: string | undefined
	scope: string
	token_type: string
}
export function refreshAccessToken(clientId: string, clientSecret: string, refreshToken: string) {
	const authToken = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
	return doRequest<RefreshAccessTokenResponse>(
		got.post(SpotifyAuthUrl + '/api/token', {
			headers: {
				Authorization: `Basic ${authToken}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			responseType: 'json',
			timeout: {
				request: DefaultTimeout,
			},
			hooks: {},
			form: {
				grant_type: 'refresh_token',
				refresh_token: refreshToken,
			},
		})
	)
}
export interface AuthorizationCodeGrantResponse {
	access_token: string
	expires_in: number
	refresh_token: string
	scope: string
	token_type: string
}
export function authorizationCodeGrant(clientId: string, clientSecret: string, redirectURI: string, authCode: string) {
	return doRequest<AuthorizationCodeGrantResponse>(
		got.post(SpotifyAuthUrl + '/api/token', {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			responseType: 'json',
			timeout: {
				request: DefaultTimeout,
			},
			hooks: {},
			form: {
				grant_type: 'authorization_code',
				redirect_uri: redirectURI,
				code: authCode,
				client_id: clientId,
				client_secret: clientSecret,
			},
		})
	)
}
