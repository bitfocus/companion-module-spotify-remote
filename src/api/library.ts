import type { SearchParameters } from 'got'
import { Response, doGetRequest, doPutRequest, doDeleteRequest, RequestOptionsBase } from './util.js'

/** Check whether the given spotify uris (eg `spotify:track:<id>`) are saved in the user's library */
export async function checkLibraryContains(
	reqOptions: RequestOptionsBase,
	uris: ReadonlyArray<string>,
): Promise<Response<boolean[]>> {
	return doGetRequest(reqOptions, `/v1/me/library/contains?uris=${encodeURIComponent(uris.join(','))}`)
}

/** Save the given spotify uris to the user's library */
export async function saveToLibrary(
	reqOptions: RequestOptionsBase,
	uris: ReadonlyArray<string>,
): Promise<Response<void>> {
	const params: SearchParameters = { uris: uris.join(',') }
	return doPutRequest(reqOptions, '/v1/me/library', params, {})
}

/** Remove the given spotify uris from the user's library */
export async function removeFromLibrary(
	reqOptions: RequestOptionsBase,
	uris: ReadonlyArray<string>,
): Promise<Response<void>> {
	const params: SearchParameters = { uris: uris.join(',') }
	return doDeleteRequest(reqOptions, '/v1/me/library', params)
}
