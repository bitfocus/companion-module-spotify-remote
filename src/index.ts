/// <reference types="spotify-api" />

import {
	CompanionHTTPRequest,
	CompanionHTTPResponse,
	CompanionVariableDefinition,
	InstanceBase,
	InstanceStatus,
	runEntrypoint,
	SomeCompanionConfigField,
} from '@companion-module/base'
import PQueue from 'p-queue'
import { GetConfigFields, DeviceConfig } from './config.js'
import { FeedbackId, GetFeedbacksList } from './feedback.js'
import { DoAction, GetActionsList } from './actions.js'
import { SpotifyPlaybackState, SpotifyState } from './state.js'
import { SpotifyInstanceBase } from './types.js'
import { UpgradeScripts } from './upgrades.js'
import { authorizationCodeGrant, GenerateAuthorizeUrl, refreshAccessToken, SpotifyAuth } from './api/auth.js'
import { getMyCurrentPlaybackState } from './api/playback.js'
import { RequestOptionsBase } from './api/util.js'

const AUTH_SCOPES = [
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

class SpotifyInstance extends InstanceBase<DeviceConfig> implements SpotifyInstanceBase {
	public spotifyAuth: SpotifyAuth | undefined // TODO - use this more

	public config: DeviceConfig

	private pollTimer: NodeJS.Timeout | undefined

	private readonly state: SpotifyState
	private readonly pollQueue = new PQueue({ concurrency: 1 })

	constructor(internal: unknown) {
		super(internal)

		this.state = {
			playbackState: null,
		}

		this.config = {}
	}

	public async checkIfApiErrorShouldRetry(err: any): Promise<boolean> {
		// Error Code 401 represents out of date token
		if ('statusCode' in err && err.statusCode == '401') {
			if (!this.config.clientId || !this.config.clientSecret || !this.config.refreshToken) {
				this.log('debug', `Missing properties required to refresh access token`)

				this.applyConfigValues()
				return false
			}
			try {
				const data = await refreshAccessToken(this.config.clientId, this.config.clientSecret, this.config.refreshToken)
				if (data.body?.access_token) {
					// Save the new token
					this.config.accessToken = data.body.access_token
					this.saveConfig(this.config)

					this.applyConfigValues()
					return true
				} else {
					this.log('debug', `No access token in refresh response`)

					// Clear the stale token
					delete this.config.accessToken
					this.saveConfig(this.config)

					this.applyConfigValues()
					return false
				}
			} catch (e: any) {
				this.log('debug', `Failed to refresh access token: ${e.toString()}`)

				// Clear the stale token
				delete this.config.accessToken
				this.saveConfig(this.config)

				this.applyConfigValues()
				return false
			}
		} else {
			const errStr = 'error' in err ? err.error.toString() : err.toString()
			this.log('debug', `Something went wrong with an API Call: ${errStr}`)
			// TODO - log better

			this.applyConfigValues()
			return false
		}
	}

	public getRequestOptionsBase(): RequestOptionsBase | null {
		if (this.config.accessToken) {
			return {
				accessToken: this.config.accessToken,
			}
		} else {
			return null
		}
	}

	private applyConfigValues(): void {
		if (
			this.config.clientId &&
			this.config.clientSecret &&
			this.config.redirectUri &&
			this.config.accessToken &&
			this.config.refreshToken
		) {
			this.spotifyAuth = {
				clientId: this.config.clientId,
				clientSecret: this.config.clientSecret,
				redirectUri: this.config.redirectUri,
				accessToken: this.config.accessToken,
				refreshToken: this.config.refreshToken,
			}

			this.updateStatus(InstanceStatus.Ok)
		} else {
			this.spotifyAuth = undefined

			this.updateStatus(InstanceStatus.BadConfig)
		}
	}

	async configUpdated(config: DeviceConfig): Promise<void> {
		this.config = config

		this.applyConfigValues()

		if (
			this.config.code &&
			this.config.clientId &&
			this.config.clientSecret &&
			this.config.redirectUri &&
			!this.config.accessToken
		) {
			authorizationCodeGrant(this.config.clientId, this.config.clientSecret, this.config.redirectUri, this.config.code)
				.then((data) => {
					if (data.body?.access_token) {
						this.config.accessToken = data.body.access_token
					} else {
						delete this.config.accessToken
					}
					if (data.body?.refresh_token) {
						this.config.refreshToken = data.body.refresh_token
					} else {
						delete this.config.refreshToken
					}
					this.saveConfig(this.config)

					this.applyConfigValues()
				})
				.catch((err) => {
					this.log('debug', `Failed to get access token: ${err?.message ?? err.toString()}`)
				})
		}
		if (
			this.config.redirectUri &&
			this.config.clientSecret &&
			this.config.clientId &&
			!this.config.accessToken &&
			!this.config.code
		) {
			this.config.authURL = GenerateAuthorizeUrl(
				this.config.clientId,
				this.config.redirectUri,
				AUTH_SCOPES,
				this.id
			).toString()
			this.saveConfig(this.config)
		}

		this.initActions()
	}

	async init(config: DeviceConfig): Promise<void> {
		this.config = config

		this.updateStatus(InstanceStatus.Connecting)

		this.applyConfigValues()

		if (this.spotifyAuth) {
			refreshAccessToken(this.spotifyAuth.clientId, this.spotifyAuth.clientSecret, this.spotifyAuth.refreshToken)
				.then((data) => {
					if (data.body?.access_token) {
						// Save the access token so that it's used in future calls
						this.config.accessToken = data.body.access_token
					} else {
						delete this.config.accessToken
					}

					this.applyConfigValues()
				})
				.catch((err) => {
					this.log('warn', `Failed to refresh access token: ${err.toString()}`)
				})
		}

		if (!this.pollTimer) {
			this.pollTimer = setInterval(() => this.queuePoll(), 3000) // Check every 3 seconds. This leaves a bit of headroom before we hit the daily api limit
		}

		this.initActions()
		this.initFeedbacks()
		this.initVariables()
	}

	async destroy(): Promise<void> {
		this.log('debug', 'destroy')

		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			delete this.pollTimer
		}
	}
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	async handleHttpRequest(request: CompanionHTTPRequest): Promise<CompanionHTTPResponse> {
		if (request.path === '/oauth/callback') {
			const authCode = request.query['code']
			if (!authCode) {
				return {
					status: 400,
					body: 'Missing auth code!',
				}
			}

			if (!this.config.clientId || !this.config.clientSecret || !this.config.redirectUri) {
				return {
					status: 400,
					body: 'Missing required config fields!',
				}
			}

			try {
				const data = await authorizationCodeGrant(
					this.config.clientId,
					this.config.clientSecret,
					this.config.redirectUri,
					authCode
				)
				if (data.body?.access_token) {
					this.config.accessToken = data.body.access_token
				} else {
					delete this.config.accessToken
				}
				if (data.body?.refresh_token) {
					this.config.refreshToken = data.body.refresh_token
				} else {
					delete this.config.refreshToken
				}
				this.saveConfig(this.config)

				this.applyConfigValues()
			} catch (err: any) {
				this.log('debug', `Failed to get access token: ${err?.message ?? err?.toString()}`)
				return {
					status: 500,
					body: `Failed to authenticate\n${err?.message ?? err?.toString()}`,
				}
			}
			// TODO

			return {
				status: 200,
				body: 'Success!\nYou can close this tab',
			}
		}

		return {
			status: 404,
		}
	}

	private initActions() {
		const executeActionWrapper = (fcn: DoAction) => {
			// Verify the api client is configured
			if (this.canPollOrPost()) {
				fcn(this, this.config.deviceId || null)
					.then(() => {
						// Do a poll asap, to catch the changes
						this.queuePoll()
					})
					.catch((e) => {
						this.log('error', `Execute action failed: ${e.toString()}`)
					})
			}
		}

		const actions = GetActionsList(executeActionWrapper)
		this.setActionDefinitions(actions)
	}
	// Set up Feedbacks
	private initFeedbacks() {
		const feedbacks = GetFeedbacksList(() => this.state)
		this.setFeedbackDefinitions(feedbacks)
	}
	private initVariables() {
		const variables: CompanionVariableDefinition[] = [
			{
				variableId: 'songName',
				name: 'Current Song Name',
			},
			{
				variableId: 'albumName',
				name: 'Current Album Name',
			},
			{
				variableId: 'artistName',
				name: 'Current Artist Name',
			},
			{
				variableId: 'isPlaying',
				name: 'Is Playback Active',
			},
			{
				variableId: 'isPlayingIcon',
				name: 'Playback Icon',
			},
			{
				variableId: 'isShuffle',
				name: 'Is Shuffle Enabled',
			},
			{
				variableId: 'repeat',
				name: 'Is Repeat Enabled',
			},
			{
				variableId: 'currentContext',
				name: 'Current Context ID',
			},
			{
				variableId: 'songPercentage',
				name: 'Percentage of the current song completed',
			},
			{
				variableId: 'songProgressSeconds',
				name: 'Progress of the current song in seconds',
			},
			{
				variableId: 'songDurationSeconds',
				name: 'Duration of the current song in seconds',
			},
			{
				variableId: 'songTimeRemaining',
				name: 'Time remaining in song (pretty formatted HH:MM:SS)',
			},
			{
				variableId: 'songTimeRemainingHours',
				name: 'Hours remaining in song (zero padded)',
			},
			{
				variableId: 'songTimeRemainingMinutes',
				name: 'Minutes remaining in song (zero padded)',
			},
			{
				variableId: 'songTimeRemainingSeconds',
				name: 'Seconds remaining in song (zero padded)',
			},
			{
				variableId: 'volume',
				name: 'Current Volume',
			},
			{
				variableId: 'currentAlbumArt',
				name: 'Currently playing album artwork',
			},
			{
				variableId: 'deviceName',
				name: 'Current device name',
			},
		]

		this.setVariableDefinitions(variables)
	}

	private canPollOrPost(): boolean {
		return !!this.spotifyAuth
	}
	public queuePoll(): void {
		// If everything is populated we can do the poll
		if (this.canPollOrPost()) {
			if (this.pollQueue.size > 1) {
				this.log('debug', `Poll queue overflow`)
			} else {
				this.pollQueue
					.add(async () => {
						if (this.canPollOrPost()) {
							try {
								await this.doPollPlaybackState()
							} catch (e: any) {
								this.log('debug', `Poll failed: ${e.toString()}`)
							}
						}
					})
					.catch((e) => {
						this.log('debug', `Failed to queue poll: ${e.toString()}`)
					})
			}
		} else {
			this.updateStatus(InstanceStatus.BadConfig)
		}
	}

	private async doPollPlaybackState() {
		const reqOptions = this.getRequestOptionsBase()
		if (!reqOptions) return
		try {
			const data = await getMyCurrentPlaybackState(reqOptions)

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
			this.updateStatus(InstanceStatus.Ok)
		} catch (err) {
			this.updateStatus(InstanceStatus.ConnectionFailure, 'Failed to query Api')

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

		// console.log('NEW STATE', JSON.stringify(newState))
		const forceUpdate = !oldState && !!newState

		// Collect updates for batch saving
		const invalidatedFeedbacks: FeedbackId[] = []
		const variableUpdates: { [variableId: string]: string | number | boolean | undefined } = {} // TODO - type of this

		if (forceUpdate || oldState?.isPlaying !== newState?.isPlaying) {
			variableUpdates['isPlaying'] = !!newState?.isPlaying
			variableUpdates['isPlayingIcon'] = newState?.isPlaying ? '\u23F5' : '\u23F9'

			invalidatedFeedbacks.push(FeedbackId.IsPlaying)
		}
		if (forceUpdate || oldState?.isShuffle !== newState?.isShuffle) {
			invalidatedFeedbacks.push(FeedbackId.IsShuffle)
			variableUpdates['isShuffle'] = !!newState?.isShuffle
		}
		if (forceUpdate || oldState?.repeatState !== newState?.repeatState) {
			invalidatedFeedbacks.push(FeedbackId.IsRepeat)
			variableUpdates['repeat'] = newState?.repeatState ?? 'off'
		}
		if (forceUpdate || oldState?.currentContext !== newState?.currentContext) {
			this.checkFeedbacks('current-context')
			variableUpdates['currentContext'] = newState?.currentContext ?? ''
		}

		// Track info
		if (forceUpdate || oldState?.trackInfo?.artistName !== newState?.trackInfo?.artistName) {
			variableUpdates['artistName'] = newState?.trackInfo?.artistName ?? ''
		}
		if (forceUpdate || oldState?.trackInfo?.name !== newState?.trackInfo?.name) {
			variableUpdates['songName'] = newState?.trackInfo?.name ?? ''
		}
		if (forceUpdate || oldState?.trackInfo?.albumName !== newState?.trackInfo?.albumName) {
			variableUpdates['albumName'] = newState?.trackInfo?.albumName ?? ''
		}
		if (forceUpdate || oldState?.trackInfo?.albumImageUrl !== newState?.trackInfo?.albumImageUrl) {
			variableUpdates['currentAlbumArt'] = newState?.trackInfo?.albumImageUrl ?? ''
		}

		// Look for track progress/duration changes
		let progressChanged = false
		if (forceUpdate || oldState?.trackProgressMs !== newState?.trackProgressMs) {
			progressChanged = true
			variableUpdates['songProgressSeconds'] = ((newState?.trackProgressMs ?? 0) / 1000).toFixed(0)
		}
		if (forceUpdate || oldState?.trackInfo?.durationMs !== newState?.trackInfo?.durationMs) {
			progressChanged = true
			variableUpdates['songDurationSeconds'] = ((newState?.trackInfo?.durationMs ?? 0) / 1000).toFixed(0)
		}
		if (forceUpdate || progressChanged) {
			const progressMs = newState?.trackProgressMs ?? 0
			const durationMs = newState?.trackInfo?.durationMs ?? 0

			variableUpdates['songPercentage'] = durationMs > 0 ? ((progressMs / durationMs) * 100).toFixed(0) : '-'

			const remainingTotalMs = Math.max(durationMs - progressMs, 0) // remaining clamped to >=0
			const remainingSeconds = Math.floor((remainingTotalMs / 1000) % 60)
			const remainingMins = Math.floor((remainingTotalMs / (1000 * 60)) % 60)
			const remainingHours = Math.floor(remainingTotalMs / (1000 * 60 * 60))
			const remainingStr = `${remainingHours.toString().padStart(2, '0')}:${remainingMins
				.toString()
				.padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`

			variableUpdates['songTimeRemaining'] = remainingStr
			variableUpdates['songTimeRemainingHours'] = remainingHours
			variableUpdates['songTimeRemainingMinutes'] = remainingMins
			variableUpdates['songTimeRemainingSeconds'] = remainingSeconds
		}

		// Device info
		if (forceUpdate || oldState?.deviceInfo?.volumePercent !== newState?.deviceInfo?.volumePercent) {
			variableUpdates['volume'] = newState?.deviceInfo?.volumePercent ?? '-'
		}
		if (forceUpdate || oldState?.deviceInfo?.name !== newState?.deviceInfo?.name) {
			invalidatedFeedbacks.push(FeedbackId.ActiveDevice)
			variableUpdates['deviceName'] = newState?.deviceInfo?.name ?? '-'
		}

		// Inform companion of the state changes
		if (invalidatedFeedbacks.length > 0) this.checkFeedbacks(...invalidatedFeedbacks)
		if (Object.keys(variableUpdates).length > 0) this.setVariableValues(variableUpdates)
	}
}

runEntrypoint(SpotifyInstance, UpgradeScripts)
