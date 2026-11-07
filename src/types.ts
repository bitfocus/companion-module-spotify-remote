import { InstanceBase } from '@companion-module/base'
import { DeviceConfig } from './config.js'
import { RequestOptionsBase } from './api/util.js'

export interface SpotifyInstanceBase extends InstanceBase<DeviceConfig> {
	config: DeviceConfig

	/**
	 * Check if an error is because of an expired auth token
	 * If so, the token will be renewed, and will return whether to retry the request
	 */
	checkIfApiErrorShouldRetry(err: any): Promise<boolean>

	getRequestOptionsBase(): RequestOptionsBase | null

	startVolumeFade(): AbortSignal

	premuteVolume: number

	/** Whether Spotify is currently refusing library requests (quota exceeded) */
	isLibraryBlocked(): boolean

	/** Record the outcome of a failed library request, pausing library requests if Spotify's quota is exceeded */
	handleLibraryError(err: unknown): void

	/** Whether a track is in the library: what is shown if it is the current track, otherwise looked up. null means retry later */
	lookupTrackInLibrary(uri: string): Promise<boolean | 'unknown' | null>

	/** Remember whether a track is in the library, after it has been changed by an action */
	setTrackInLibrary(uri: string, inLibrary: boolean): void

	// /** Queue a poll for playback status */
	// queuePoll(): void
}
