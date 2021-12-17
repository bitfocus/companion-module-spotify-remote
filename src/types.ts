import InstanceSkel = require('../../../instance_skel')
import SpotifyWebApi = require('spotify-web-api-node')
import { DeviceConfig } from './config'

export interface SpotifyInstanceBase extends InstanceSkel<DeviceConfig> {
	/** Api client setup with credentials */
	readonly spotifyApi: SpotifyWebApi

	/**
	 * Check if an error is because of an expired auth token
	 * If so, the token will be renewed, and will return whether to retry the request
	 */
	checkIfApiErrorShouldRetry(err: any): Promise<boolean>

	// /** Queue a poll for playback status */
	// queuePoll(): void
}
