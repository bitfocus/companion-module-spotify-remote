import got from 'got'
import { Response, doRequest, SpotifyBaseUrl, DefaultTimeout } from './util'

export async function GetPlaybackState(
	accessToken: string
): Promise<Response<SpotifyApi.CurrentPlaybackResponse | undefined>> {
	return doRequest<SpotifyApi.CurrentPlaybackResponse>(
		got.get(SpotifyBaseUrl + '/v1/me/player', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
			responseType: 'json',
			timeout: {
				request: DefaultTimeout,
			},
			hooks: {},
		})
	)
}
