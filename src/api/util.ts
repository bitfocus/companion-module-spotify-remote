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
			// responseType: 'json',
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
			// responseType: 'json',
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
			// responseType: 'json',
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
			// Preserve the response body - for the Spotify auth/api endpoints this is where the
			// actual reason for the failure lives (eg `{ error: 'invalid_grant', error_description: ... }`).
			// Without this everything downstream can only report `[object Object]`.
			body: e.response.body,
			error: e,
		})
	} else {
		// eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
		return Promise.reject({
			headers: {},
			statusCode: 500,
			body: undefined,
			error: e,
		})
	}
}

/**
 * Produce a human readable message from an error thrown by one of the doRequest helpers.
 * Digs the real reason out of the Spotify response body where possible.
 */
export function formatApiError(err: unknown): string {
	if (!err || typeof err !== 'object') return String(err)

	const e = err as { statusCode?: number; body?: unknown; error?: unknown; message?: string }
	const suffix = e.statusCode ? ` (HTTP ${e.statusCode})` : ''

	let body = e.body
	if (typeof body === 'string' && body.length > 0) {
		try {
			body = JSON.parse(body)
		} catch {
			return `${body}${suffix}`
		}
	}

	if (body && typeof body === 'object') {
		const b = body as { error?: unknown; error_description?: unknown }
		// OAuth token errors: { error: 'invalid_grant', error_description: '...' }
		if (typeof b.error === 'string') {
			return typeof b.error_description === 'string'
				? `${b.error}: ${b.error_description}${suffix}`
				: `${b.error}${suffix}`
		}
		// Web API errors: { error: { status, message } }
		if (b.error && typeof b.error === 'object') {
			const inner = b.error as { message?: unknown }
			if (typeof inner.message === 'string') return `${inner.message}${suffix}`
		}
	}

	if (e.error instanceof Error && e.error.message) return `${e.error.message}${suffix}`
	if (typeof e.error === 'string' && e.error) return `${e.error}${suffix}`
	if (typeof e.message === 'string' && e.message) return e.message
	return `Request failed${suffix}`
}

/**
 * Detect the Spotify OAuth `invalid_grant` error. This is returned (with HTTP 400) when an
 * authorization code or refresh token is expired, revoked or otherwise no longer usable - a
 * state that can never recover by retrying, so the user must re-authorize.
 */
export function isInvalidGrantError(err: unknown): boolean {
	if (!err || typeof err !== 'object') return false

	let body = (err as { body?: unknown }).body
	if (typeof body === 'string') {
		try {
			body = JSON.parse(body)
		} catch {
			return false
		}
	}

	return !!body && typeof body === 'object' && (body as { error?: unknown }).error === 'invalid_grant'
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
	// The raw response body from Spotify, if any (parsed JSON object or string). Carries the
	// `error` / `error_description` that explains the failure.
	body?: unknown
	// message: any
	error: Error
}

export interface DeviceOptions {
	deviceId?: string
}
