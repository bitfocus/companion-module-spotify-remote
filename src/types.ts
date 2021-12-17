import InstanceSkel = require('../../../instance_skel')
import SpotifyWebApi = require('spotify-web-api-node')
import { DeviceConfig } from './config'

export interface SpotifyInstanceBase extends InstanceSkel<DeviceConfig> {
	readonly spotifyApi: SpotifyWebApi

	checkIfApiErrorShouldRetry(err: any): Promise<boolean>
}
