import { Response, doGetRequest, RequestOptionsBase, doPutRequest, QueryParameters, DeviceOptions } from './util.js'

export async function getMyDevices(
	reqOptions: RequestOptionsBase,
): Promise<Response<SpotifyApi.UserDevicesResponse | undefined>> {
	return doGetRequest(reqOptions, '/v1/me/player/devices')
}

export async function setVolume(
	reqOptions: RequestOptionsBase,
	volumePercent: number,
	options?: DeviceOptions,
): Promise<Response<void>> {
	const params: QueryParameters = {
		volume_percent: volumePercent,
	}
	if (options?.deviceId) params.device_id = options.deviceId

	return doPutRequest(reqOptions, '/v1/me/player/volume', params, {})
}
