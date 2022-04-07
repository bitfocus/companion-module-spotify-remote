import { URL } from 'url'
import { SpotifyAuthUrl } from './util'

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
