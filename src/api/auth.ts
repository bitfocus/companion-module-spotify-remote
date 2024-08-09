import got from 'got'
import { URL } from 'url'
import { DefaultTimeout, doRequest, Response, SpotifyAuthUrl } from './util.js'

export function GenerateAuthorizeUrl(
	clientId: string,
	redirectUri: string,
	scopes: string[],
	state: string | undefined
): URL {
	const url = new URL(SpotifyAuthUrl + '/authorize')
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
export async function refreshAccessToken(
	clientId: string,
	clientSecret: string,
	refreshToken: string
): Promise<Response<RefreshAccessTokenResponse>> {
	const authToken = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
	return doRequest<RefreshAccessTokenResponse>(
		got.post<RefreshAccessTokenResponse>(SpotifyAuthUrl + '/api/token', {
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
export async function authorizationCodeGrant(
	clientId: string,
	clientSecret: string,
	redirectURI: string,
	authCode: string
): Promise<Response<AuthorizationCodeGrantResponse>> {
	const authToken = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
	return doRequest<AuthorizationCodeGrantResponse>(
		got.post<AuthorizationCodeGrantResponse>(SpotifyAuthUrl + '/api/token', {
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
				grant_type: 'authorization_code',
				redirect_uri: redirectURI,
				code: authCode,
				client_id: clientId,
				client_secret: clientSecret,
			},
		})
	)
}
