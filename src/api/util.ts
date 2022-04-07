import { CancelableRequest, HTTPError } from 'got'
import { IncomingHttpHeaders } from 'http'

export const SpotifyBaseUrl = 'https://api.spotify.com'
export const SpotifyAuthUrl = 'https://accounts.spotify.com/authorize'
export const DefaultTimeout = 10000

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
