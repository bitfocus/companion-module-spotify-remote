import type { SearchParameters } from 'got'
import { Response, doGetRequest, RequestOptionsBase } from './util.js'

export interface PagingOptions {
	limit?: number
	offset?: number
}

export async function getAlbumTracks(
	reqOptions: RequestOptionsBase,
	albumId: string,
	options?: PagingOptions,
): Promise<Response<SpotifyApi.AlbumTracksResponse | undefined>> {
	const params: SearchParameters = {}
	if (options?.limit !== undefined) params.limit = options.limit
	if (options?.offset !== undefined) params.offset = options.offset

	return doGetRequest(reqOptions, `/v1/albums/${encodeURIComponent(albumId)}/tracks`, params)
}
