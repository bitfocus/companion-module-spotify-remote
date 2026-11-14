import type { SearchParameters } from 'got'
import type { PagingOptions } from './album.js'
import { Response, doGetRequest, RequestOptionsBase } from './util.js'

/**
 * Since February 2026, Spotify only returns the items of playlists the user owns.
 */
export async function getPlaylistItems(
	reqOptions: RequestOptionsBase,
	playlistId: string,
	options?: PagingOptions,
): Promise<Response<SpotifyApi.PlaylistTrackResponse | undefined>> {
	const params: SearchParameters = {}
	if (options?.limit !== undefined) params.limit = options.limit
	if (options?.offset !== undefined) params.offset = options.offset

	return doGetRequest(reqOptions, `/v1/playlists/${encodeURIComponent(playlistId)}/items`, params)
}
