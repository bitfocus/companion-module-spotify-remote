import InstanceSkel = require('../../../instance_skel')
import SpotifyWebApi = require('spotify-web-api-node')
import { GetConfigFields, DeviceConfig } from './config'
import { FeedbackId, GetFeedbacksList } from './feedback'
import { GetActionsList } from './actions'
import { CompanionSystem } from '../../../instance_skel_types'
import PQueue from 'p-queue'
import { SpotifyPlaybackState, SpotifyState } from './state'
import { SpotifyInstanceBase } from './types'

const scopes = [
	'user-read-playback-state',
	'user-modify-playback-state',
	'user-read-currently-playing',
	'streaming',
	'app-remote-control',
	'playlist-read-collaborative',
	'playlist-read-private',
	'user-library-read',
	'user-top-read',
	'user-read-playback-position',
]

class SpotifyInstance extends InstanceSkel<DeviceConfig> implements SpotifyInstanceBase {
	public readonly spotifyApi = new SpotifyWebApi()
	private pollTimer: NodeJS.Timeout | undefined

	private readonly state: SpotifyState
	private readonly pollQueue = new PQueue({ concurrency: 1 })

	constructor(system: CompanionSystem, id: string, config: DeviceConfig) {
		super(system, id, config)

		this.state = {
			playbackState: null,
		}
	}
	public async checkIfApiErrorShouldRetry(err: any): Promise<boolean> {
		// Error Code 401 represents out of date token
		if ('statusCode' in err && err.statusCode == '401') {
			try {
				const data = await this.spotifyApi.refreshAccessToken()
				this.spotifyApi.setAccessToken(data.body['access_token'])

				// Save the new token
				this.config.accessToken = data.body.access_token
				this.saveConfig()

				return true
			} catch (e: any) {
				this.debug(`Failed to refresh access token: ${e.toString()}`)
				return false
			}
		} else {
			this.debug(`Something went wrong with an API Call: ${err.toString()}`)
			// TODO - log better
			return false
		}
	}

	// PlaySpecific(action, device) {
	// 	let self = this

	// 	let params = {
	// 		device_id: device,
	// 	}

	// 	if (action.action == 'playSpecificList') {
	// 		params.context_uri = `spotify:${action.options.type}:${action.options.context_uri}`
	// 	}

	// 	if (action.action == 'playSpecificTracks') {
	// 		let tracks = action.options.tracks.split(',')
	// 		tracks = tracks.map((track) => 'spotify:track:' + track.trim())
	// 		params.uris = tracks
	// 	}

	// 	self.spotifyApi.getMyCurrentPlaybackState().then(
	// 		function (data) {
	// 			if (data.body && data.body.context && data.body.context.uri === params.context_uri) {
	// 				if (
	// 					!action.options.behavior ||
	// 					action.options.behavior == 'return' ||
	// 					(action.options.behavior == 'resume' && data.body.is_playing)
	// 				) {
	// 					return this.log('warning', `Already playing that ${action.options.type}: ${action.options.context_uri}`)
	// 				}

	// 				if (action.options.behavior == 'resume') {
	// 					return self.spotifyApi
	// 						.play({
	// 							device_id: device,
	// 						})
	// 						.then(
	// 							function (res) {
	// 								console.log('done')
	// 								self.PollPlaybackState()
	// 							},
	// 							function (err) {
	// 								console.log('Something went wrong!', err)
	// 							}
	// 						)
	// 				}
	// 			}

	// 			self.spotifyApi.play(params).then(
	// 				function (res) {
	// 					console.log('done')
	// 					self.PollPlaybackState()
	// 				},
	// 				function (err) {
	// 					console.log('Something went wrong!', err)
	// 				}
	// 			)
	// 		},
	// 		function (err) {
	// 			self.checkIfApiErrorShouldRetry(err).then(function (retry) {
	// 				if (retry) {
	// 					self.PlaySpecific(action)
	// 				}
	// 			})
	// 		}
	// 	)
	// }
	// ChangeShuffleState(action) {
	// 	let self = this
	// 	self.spotifyApi.getMyCurrentPlaybackState().then(
	// 		function (data) {
	// 			if (data.body && data.body.shuffle_state) {
	// 				if (action.action == 'shuffleOff' || action.action == 'shuffleToggle') {
	// 					self.spotifyApi.setShuffle(false).then(
	// 						function () {
	// 							self.PollPlaybackState()
	// 						},
	// 						function (err) {
	// 							self.checkIfApiErrorShouldRetry(err).then(function (retry) {
	// 								if (retry) {
	// 									self.ChangeShuffleState(action)
	// 								}
	// 							})
	// 						}
	// 					)
	// 				}
	// 			} else {
	// 				if (action.action == 'shuffleOn' || action.action == 'shuffleToggle') {
	// 					self.spotifyApi.setShuffle(true).then(
	// 						function () {
	// 							self.PollPlaybackState()
	// 						},
	// 						function (err) {
	// 							self.checkIfApiErrorShouldRetry(err).then(function (retry) {
	// 								if (retry) {
	// 									self.ChangeShuffleState(action)
	// 								}
	// 							})
	// 						}
	// 					)
	// 				}
	// 			}
	// 		},
	// 		function (err) {
	// 			self.checkIfApiErrorShouldRetry(err).then(function (retry) {
	// 				if (retry) {
	// 					self.ChangeShuffleState(action)
	// 				}
	// 			})
	// 		}
	// 	)
	// }

	// SeekPosition(action) {
	// 	let self = this
	// 	let ms = action.options.position

	// 	self.spotifyApi.seek(ms).then(
	// 		function () {
	// 			self.PollPlaybackState()
	// 		},
	// 		function (err) {
	// 			self.checkIfApiErrorShouldRetry(err).then(function (retry) {
	// 				if (retry) {
	// 					self.SeekPosition(action)
	// 				}
	// 			})
	// 		}
	// 	)
	// }

	private applyConfigValues(config: DeviceConfig): void {
		if (config.clientId) {
			this.spotifyApi.setClientId(config.clientId)
		} else {
			this.spotifyApi.resetClientId()
		}

		if (config.clientSecret) {
			this.spotifyApi.setClientSecret(config.clientSecret)
		} else {
			this.spotifyApi.resetClientSecret()
		}

		if (config.redirectUri) {
			this.spotifyApi.setRedirectURI(config.redirectUri)
		} else {
			this.spotifyApi.resetRedirectURI()
		}

		if (config.accessToken) {
			this.spotifyApi.setAccessToken(config.accessToken)
		} else {
			this.spotifyApi.resetAccessToken()
		}

		if (config.refreshToken) {
			this.spotifyApi.setRefreshToken(config.refreshToken)
		} else {
			this.spotifyApi.resetRefreshToken()
		}
	}

	updateConfig(config: DeviceConfig): void {
		this.config = config

		this.applyConfigValues(config)

		if (this.config.code && !this.config.accessToken) {
			this.spotifyApi
				.authorizationCodeGrant(this.config.code)
				.then((data) => {
					this.config.accessToken = data.body['access_token']
					this.config.refreshToken = data.body['refresh_token']
					this.saveConfig()

					// Set the access token on the API object to use it in later calls
					this.spotifyApi.setAccessToken(data.body['access_token'])
					this.spotifyApi.setRefreshToken(data.body['refresh_token'])
				})
				.catch((err) => {
					this.debug(`Failed to get access token: ${err.toString()}`)
				})
		}
		if (
			this.config.redirectUri &&
			this.config.clientSecret &&
			this.config.clientId &&
			!this.config.accessToken &&
			!this.config.code
		) {
			this.config.authURL = this.spotifyApi.createAuthorizeURL(scopes, '')
			this.saveConfig()
		}

		this.initActions()
	}
	init(): void {
		this.status(this.STATUS_WARNING, 'Configuring')

		this.applyConfigValues(this.config)

		this.spotifyApi.refreshAccessToken().then(
			(data) => {
				// Save the access token so that it's used in future calls
				this.spotifyApi.setAccessToken(data.body['access_token'])
			},
			(err) => {
				console.log('Could not refresh access token', err)
			}
		)

		if (!this.pollTimer) {
			this.pollTimer = setInterval(() => this.queuePoll(), 250) // Check every 0.25 seconds
		}

		this.initActions()
		this.initFeedbacks()
		this.initVariables()
	}

	destroy(): void {
		this.debug('destroy')

		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			delete this.pollTimer
		}
	}
	config_fields() {
		return GetConfigFields()
	}
	private initActions() {
		const actions = GetActionsList((fcn) => {
			if (this.config.deviceId && this.canPollOrPost()) {
				fcn(this, this.config.deviceId)
					.then(() => {
						// Do a poll asap
						this.queuePoll()
					})
					.catch((e) => {
						this.debug(`Failed to execute action: ${e.toString()}`)
					})
			}
		})
		this.setActions(actions)
	}
	// Set up Feedbacks
	private initFeedbacks() {
		const feedbacks = GetFeedbacksList(this, () => this.state)
		this.setFeedbackDefinitions(feedbacks)
	}
	private initVariables() {
		const variables = [
			{
				name: 'songName',
				label: 'Current Song Name',
			},
			{
				name: 'albumName',
				label: 'Current Album Name',
			},
			{
				name: 'artistName',
				label: 'Current Artist Name',
			},
			{
				name: 'isPlaying',
				label: 'Is Playback Active',
			},
			{
				name: 'isPlayingIcon',
				label: 'Playback Icon',
			},
			{
				name: 'isShuffle',
				label: 'Is Shuffle Enabled',
			},
			{
				name: 'repeat',
				label: 'Is Repeat Enabled',
			},
			{
				name: 'currentContext',
				label: 'Current Context ID',
			},
			{
				name: 'songPercentage',
				label: 'Percentage of the current song completed',
			},
			{
				name: 'songProgressSeconds',
				label: 'Progress of the current song in seconds',
			},
			{
				name: 'songDurationSeconds',
				label: 'Duration of the current song in seconds',
			},
			{
				name: 'songTimeRemaining',
				label: 'Time remaining in song (pretty formatted HH:MM:SS)',
			},
			{
				name: 'songTimeRemainingHours',
				label: 'Hours remaining in song (zero padded)',
			},
			{
				name: 'songTimeRemainingMinutes',
				label: 'Minutes remaining in song (zero padded)',
			},
			{
				name: 'songTimeRemainingSeconds',
				label: 'Seconds remaining in song (zero padded)',
			},
			{
				name: 'volume',
				label: 'Current Volume',
			},
			{
				name: 'currentAlbumArt',
				label: 'Currently playing album artwork',
			},
			{
				name: 'deviceName',
				label: 'Current device name',
			},
		]

		this.setVariableDefinitions(variables)
	}

	private canPollOrPost(): boolean {
		return !!(
			this.spotifyApi.getClientId() &&
			this.spotifyApi.getAccessToken() &&
			this.spotifyApi.getClientSecret() &&
			this.spotifyApi.getRefreshToken()
		)
	}
	public queuePoll(): void {
		// If everything is populated we can do the poll
		if (this.canPollOrPost()) {
			if (this.pollQueue.size > 1) {
				this.debug(`Poll queue overflow`)
			} else {
				this.pollQueue
					.add(async () => {
						if (this.canPollOrPost()) {
							try {
								await this.doPollPlaybackState()
							} catch (e: any) {
								this.debug(`Poll failed: ${e.toString()}`)
							}
						}
					})
					.catch((e) => {
						this.debug(`Failed to queue poll: ${e.toString()}`)
					})
			}
		} else {
			this.status(this.STATUS_ERROR, 'Missing required config fields')
		}
	}

	private async doPollPlaybackState() {
		try {
			const data = await this.spotifyApi.getMyCurrentPlaybackState()

			// Transform the library state into a minimal state that we want to track
			let newState: SpotifyPlaybackState | null = null
			if (data.body) {
				newState = {
					isPlaying: !!data.body.is_playing,
					isShuffle: !!data.body.shuffle_state,
					repeatState: data.body.repeat_state,
					currentContext: data.body.context && data.body.context.uri.split(':')[2],
					trackProgressMs: data.body.progress_ms ?? 0,
					trackInfo: null,
					deviceInfo: null,
				}

				if (data.body.item) {
					newState.trackInfo = {
						durationMs: data.body.item.duration_ms,
						name: data.body.item.name,
						artistName: null,
						albumName: null,
						albumImageUrl: null,
					}

					if ('artists' in data.body.item) {
						const rawArtists = data.body.item.artists
						newState.trackInfo.artistName = rawArtists.map((a) => a.name).join(', ')
					}

					if ('album' in data.body.item) {
						const rawAlbum = data.body.item.album
						newState.trackInfo.albumName = rawAlbum.name

						if (rawAlbum.images.length > 0) newState.trackInfo.albumImageUrl = rawAlbum.images[0].url
					}
				}

				if (data.body.device) {
					newState.deviceInfo = {
						id: data.body.device.id,
						name: data.body.device.name,

						volumePercent: data.body.device.volume_percent,
					}
				}
			}

			// Diff the state and inform companion of anything that changed
			this.diffAndSavePlaybackState(newState)
			this.status(this.STATUS_OK)
		} catch (err) {
			this.status(this.STATUS_ERROR, 'Failed to query Api')

			const retry = await this.checkIfApiErrorShouldRetry(err)
			if (retry) {
				this.queuePoll()
			} else {
				// clear the playback state, as we don't know what is going on..
				this.diffAndSavePlaybackState(null)
			}
		}
	}

	private diffAndSavePlaybackState(newState: SpotifyPlaybackState | null) {
		const oldState = this.state.playbackState
		this.state.playbackState = newState

		// Collect updates for batch saving
		const invalidatedFeedbacks: FeedbackId[] = []
		const variableUpdates: { [variableId: string]: string | number | boolean | undefined } = {} // TODO - type of this

		if (oldState?.isPlaying !== newState?.isPlaying) {
			variableUpdates['isPlaying'] = !!newState?.isPlaying
			variableUpdates['isPlayingIcon'] = newState?.isPlaying ? '\u23F5' : '\u23F9'

			invalidatedFeedbacks.push(FeedbackId.IsPlaying)
		}
		if (oldState?.isShuffle !== newState?.isShuffle) {
			invalidatedFeedbacks.push(FeedbackId.IsShuffle)
			variableUpdates['isShuffle'] = !!newState?.isShuffle
		}
		if (oldState?.repeatState !== newState?.repeatState) {
			invalidatedFeedbacks.push(FeedbackId.IsRepeat)
			variableUpdates['repeat'] = newState?.repeatState ?? 'off'
		}
		if (oldState?.currentContext !== newState?.currentContext) {
			this.checkFeedbacks('current-context')
			variableUpdates['currentContext'] = newState?.currentContext ?? ''
		}

		// Track info
		if (oldState?.trackInfo?.artistName !== newState?.trackInfo?.artistName) {
			variableUpdates['artistName'] = newState?.trackInfo?.artistName ?? ''
		}
		if (oldState?.trackInfo?.name !== newState?.trackInfo?.name) {
			variableUpdates['songName'] = newState?.trackInfo?.name ?? ''
		}
		if (oldState?.trackInfo?.albumName !== newState?.trackInfo?.albumName) {
			variableUpdates['albumName'] = newState?.trackInfo?.albumName ?? ''
		}
		if (oldState?.trackInfo?.albumImageUrl !== newState?.trackInfo?.albumImageUrl) {
			variableUpdates['currentAlbumArt'] = newState?.trackInfo?.albumImageUrl ?? ''
		}

		// Look for track progress/duration changes
		let progressChanged = false
		if (oldState?.trackProgressMs !== newState?.trackProgressMs) {
			progressChanged = true
			variableUpdates['songProgressSeconds'] = ((newState?.trackProgressMs ?? 0) / 1000).toFixed(0)
		}
		if (oldState?.trackInfo?.durationMs !== newState?.trackInfo?.durationMs) {
			progressChanged = true
			variableUpdates['songDurationSeconds'] = ((newState?.trackInfo?.durationMs ?? 0) / 1000).toFixed(0)
		}
		if (progressChanged) {
			const progressMs = newState?.trackProgressMs ?? 0
			const durationMs = newState?.trackInfo?.durationMs ?? 0

			variableUpdates['songPercentage'] = durationMs > 0 ? ((progressMs / durationMs) * 100).toFixed(0) : '-'

			const remainingTotalMs = Math.max(durationMs - progressMs, 0) // remaining clamped to >=0
			const remainingSeconds = (remainingTotalMs / 1000) % 60
			const remainingMins = (remainingTotalMs / (1000 * 60)) % 60
			const remainingHours = remainingTotalMs / (1000 * 60 * 60)
			const remainingStr = `${remainingHours.toString().padStart(2, '0')}:${remainingMins
				.toString()
				.padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`

			variableUpdates['songTimeRemaining'] = remainingStr
			variableUpdates['songTimeRemainingHours'] = remainingHours
			variableUpdates['songTimeRemainingMinutes'] = remainingMins
			variableUpdates['songTimeRemainingSeconds'] = remainingSeconds
		}

		// Device info
		if (oldState?.deviceInfo?.volumePercent !== newState?.deviceInfo?.volumePercent) {
			variableUpdates['volume'] = newState?.deviceInfo?.volumePercent ?? '-'
		}
		if (oldState?.deviceInfo?.name !== newState?.deviceInfo?.name) {
			invalidatedFeedbacks.push(FeedbackId.ActiveDevice)
			variableUpdates['deviceName'] = newState?.deviceInfo?.name ?? '-'
		}

		// Inform companion of the state changes
		if (invalidatedFeedbacks.length > 0) this.checkFeedbacks(...invalidatedFeedbacks)
		if (Object.keys(variableUpdates).length > 0) this.setVariables(variableUpdates as any)
	}

	// action(action) {
	// 	let self = this

	// 	if (action.action == 'play/pause' || action.action == 'play' || action.action == 'pause') {
	// 		self.ChangePlayState(action, self.config.deviceId)
	// 	}

	// 	if (action.action == 'playSpecificList' || action.action == 'playSpecificTracks') {
	// 		self.PlaySpecific(action, self.config.deviceId)
	// 	}

	// 	if (action.action == 'shuffleToggle' || action.action == 'shuffleOn' || action.action == 'shuffleOff') {
	// 		self.ChangeShuffleState(action)
	// 	}

	// 	if (action.action == 'seekPosition') {
	// 		self.SeekPosition(action, self.config.position)
	// 	}

	// 	if (action.action == 'activeDeviceToConfig') {
	// 		self.spotifyApi.getMyDevices().then(
	// 			function (data) {
	// 				let availableDevices = data.body.devices
	// 				for (let i = 0; i < availableDevices.length; i++) {
	// 					if (availableDevices[i].is_active) {
	// 						self.config.deviceId = availableDevices[i].id
	// 						self.saveConfig()
	// 					}
	// 				}
	// 			},
	// 			function (err) {
	// 				console.log('Something went wrong!', err)
	// 			}
	// 		)
	// 	}

	// 	if (action.action == 'switchActiveDevice') {
	// 		let Id = action.options.deviceId
	// 		self.config.deviceId = Id
	// 		self.saveConfig()
	// 		self.TransferPlayback(self.config.deviceId)
	// 	}
	// }
}

export = SpotifyInstance
