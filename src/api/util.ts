import got, { CancelableRequest, HTTPError } from 'got'
import { IncomingHttpHeaders } from 'http'

export const SpotifyBaseUrl = 'https://api.spotify.com'
export const SpotifyAuthUrl = 'https://accounts.spotify.com/authorize'
export const DefaultTimeout = 10000

export async function doGetRequest<T>(reqOptions: RequestOptionsBase, pathname: string): Promise<Response<T>> {
	return doRequest<T>(
		got.get(SpotifyBaseUrl + pathname, {
			headers: {
				Authorization: `Bearer ${reqOptions.accessToken}`,
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

export type QueryParameters = Record<string, string | number | boolean | null | undefined>
export type BodyParameters = Record<string, any>

export async function doPutRequest<T>(
	reqOptions: RequestOptionsBase,
	pathname: string,
	queryParams: QueryParameters,
	body: BodyParameters
): Promise<Response<T>> {
	return doRequest<T>(
		got.put(SpotifyBaseUrl + pathname, {
			headers: {
				Authorization: `Bearer ${reqOptions.accessToken}`,
				'Content-Type': 'application/json',
			},
			responseType: 'json',
			timeout: {
				request: DefaultTimeout,
			},
			hooks: {},
			searchParams: queryParams,
			json: body,
		})
	)
}

export async function doPostRequest<T>(
	reqOptions: RequestOptionsBase,
	pathname: string,
	queryParams: QueryParameters
): Promise<Response<T>> {
	return doRequest<T>(
		got.post(SpotifyBaseUrl + pathname, {
			headers: {
				Authorization: `Bearer ${reqOptions.accessToken}`,
				'Content-Type': 'application/json',
			},
			responseType: 'json',
			timeout: {
				request: DefaultTimeout,
			},
			hooks: {},
			searchParams: queryParams,
		})
	)
}

export async function doRequest<T>(req: CancelableRequest<Response<T>>): Promise<Response<T>> {
	try {
		console.log('json', await req.json(), (await req.buffer()).length)
		const res = await req
		// console.log(res.body)
		return {
			headers: res.headers,
			statusCode: res.statusCode,
			body: await req.json(),
		}
	} catch (e: unknown) {
		if (e instanceof HTTPError) {
			return Promise.reject({
				headers: e.response.headers,
				statusCode: e.response.statusCode,
				error: e,
			})
		} else {
			return Promise.reject({
				headers: {},
				statusCode: 500,
				error: e,
			})
		}
	}
}

export interface RequestOptionsBase {
	accessToken: string
}

export interface Response<T> {
	body: T | null
	headers: IncomingHttpHeaders
	statusCode: number
}

export interface ApiError {
	headers: IncomingHttpHeaders
	statusCode: number
	// message: any
	error: Error
}

export interface DeviceOptions {
	deviceId?: string
}
