import { DeviceConfig } from './config'
import { RequestOptionsBase } from './api/util'
import { InstanceBase } from '@companion-module/base'

export interface SpotifyInstanceBase extends InstanceBase<DeviceConfig> {
	config: DeviceConfig

	/**
	 * Check if an error is because of an expired auth token
	 * If so, the token will be renewed, and will return whether to retry the request
	 */
	checkIfApiErrorShouldRetry(err: any): Promise<boolean>

	getRequestOptionsBase(): RequestOptionsBase | null

	// /** Queue a poll for playback status */
	// queuePoll(): void
}
