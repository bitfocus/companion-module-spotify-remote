import {
	Response,
	doGetRequest,
	RequestOptionsBase,
	DeviceOptions,
	QueryParameters,
	doPostRequest,
	doPutRequest,
	BodyParameters,
} from './util.js'

export async function getMyCurrentPlaybackState(
	reqOptions: RequestOptionsBase
): Promise<Response<SpotifyApi.CurrentPlaybackResponse | undefined>> {
	return doGetRequest(reqOptions, '/v1/me/player')
}

export async function skipToNext(reqOptions: RequestOptionsBase, options?: DeviceOptions): Promise<Response<void>> {
	const params: QueryParameters = {}
	if (options && 'deviceId' in options) params.device_id = options.deviceId

	return doPostRequest(reqOptions, '/v1/me/player/next', params)
}

export async function skipToPrevious(reqOptions: RequestOptionsBase, options?: DeviceOptions): Promise<Response<void>> {
	const params: QueryParameters = {}
	if (options && 'deviceId' in options) params.device_id = options.deviceId

	return doPostRequest(reqOptions, '/v1/me/player/previous', params)
}

export interface TransferPlaybackOptions {
	play?: boolean
}
export async function transferMyPlayback(
	reqOptions: RequestOptionsBase,
	deviceIds: ReadonlyArray<string>,
	options?: TransferPlaybackOptions
): Promise<Response<void>> {
	const body: BodyParameters = {
		...options,
		device_ids: deviceIds,
	}

	return doPutRequest(reqOptions, '/v1/me/player', {}, body)
}

export async function pause(reqOptions: RequestOptionsBase, options?: DeviceOptions): Promise<Response<void>> {
	const params: QueryParameters = {}
	if (options && 'deviceId' in options) params.device_id = options.deviceId

	return doPutRequest(reqOptions, '/v1/me/player/pause', params, {})
}

export interface PlayOptions extends DeviceOptions {
	context_uri?: string | undefined
	uris?: ReadonlyArray<string> | undefined
	offset?: { position: number } | { uri: string } | undefined
	position_ms?: number | undefined
}
export async function play(reqOptions: RequestOptionsBase, options?: PlayOptions): Promise<Response<void>> {
	const params: QueryParameters = {}
	const body: BodyParameters = {}

	if (options) {
		if ('deviceId' in options) params.device_id = options.deviceId

		if ('context_uri' in options) body.context_uri = options.context_uri
		if ('uris' in options) body.uris = options.uris
		if ('offset' in options) body.offset = options.offset
		if ('position_ms' in options) body.position_ms = options.position_ms
	}

	return doPutRequest(reqOptions, '/v1/me/player/play', params, body)
}

export async function setRepeat(
	reqOptions: RequestOptionsBase,
	state: 'off' | 'track' | 'context',
	options?: DeviceOptions
): Promise<Response<void>> {
	const params: QueryParameters = {
		state,
	}
	if (options && 'deviceId' in options) params.device_id = options.deviceId

	return doPutRequest(reqOptions, '/v1/me/player/repeat', params, {})
}

export async function setShuffle(
	reqOptions: RequestOptionsBase,
	state: boolean,
	options?: DeviceOptions
): Promise<Response<void>> {
	const params: QueryParameters = {
		state,
	}
	if (options && 'deviceId' in options) params.device_id = options.deviceId

	return doPutRequest(reqOptions, '/v1/me/player/shuffle', params, {})
}

export async function seek(
	reqOptions: RequestOptionsBase,
	positionMs: number,
	options?: DeviceOptions
): Promise<Response<void>> {
	const params: QueryParameters = {
		position_ms: positionMs,
	}
	if (options && 'deviceId' in options) params.device_id = options.deviceId

	return doPutRequest(reqOptions, '/v1/me/player/seek', params, {})
}
