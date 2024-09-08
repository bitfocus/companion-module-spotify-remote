import got, { CancelableRequest, HTTPError } from 'got'
import { IncomingHttpHeaders } from 'http'

export const SpotifyBaseUrl = 'https://api.spotify.com'
export const SpotifyAuthUrl = 'https://accounts.spotify.com'
export const DefaultTimeout = 10000

export async function doGetRequest<T>(reqOptions: RequestOptionsBase, pathname: string): Promise<Response<T>> {
	return doRequest<T>(
		got.get<T>(SpotifyBaseUrl + pathname, {
			headers: {
				Authorization: `Bearer ${reqOptions.accessToken}`,
				'Content-Type': 'application/json',
			},
			responseType: 'json',
			timeout: {
				request: DefaultTimeout,
			},
			hooks: {},
		}),
	)
}

export type QueryParameters = Record<string, string | number | boolean | null | undefined>
export type BodyParameters = Record<string, any>

export async function doPutRequest(
	reqOptions: RequestOptionsBase,
	pathname: string,
	queryParams: QueryParameters,
	body: BodyParameters,
): Promise<Response<void>> {
	return doRequestNoResponse(
		got.put<void>(SpotifyBaseUrl + pathname, {
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
		}),
	)
}

export async function doPostRequest(
	reqOptions: RequestOptionsBase,
	pathname: string,
	queryParams: QueryParameters,
): Promise<Response<void>> {
	return doRequestNoResponse(
		got.post<void>(SpotifyBaseUrl + pathname, {
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
		}),
	)
}

export async function doRequestNoResponse(req: CancelableRequest<Response<void>>): Promise<Response<void>> {
	try {
		// console.log('json', await req.json(), (await req.buffer()).length)
		const res = await req

		return {
			headers: res.headers,
			statusCode: res.statusCode,
			body: null,
		}
	} catch (e: unknown) {
		return wrapHttpError(e)
	}
}

export async function doRequest<T>(req: CancelableRequest<Response<T>>): Promise<Response<T>> {
	try {
		// console.log('json', await req.json(), (await req.buffer()).length)
		const res = await req

		console.log('body', res.body)
		return {
			headers: res.headers,
			statusCode: res.statusCode,
			body: await req.json(),
		}
	} catch (e: unknown) {
		return wrapHttpError(e)
	}
}

async function wrapHttpError(e: unknown): Promise<never> {
	if (e instanceof HTTPError) {
		// eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
		return Promise.reject({
			headers: e.response.headers,
			statusCode: e.response.statusCode,
			error: e,
		})
	} else {
		// eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
		return Promise.reject({
			headers: {},
			statusCode: 500,
			error: e,
		})
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
