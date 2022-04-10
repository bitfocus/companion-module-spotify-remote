/// <reference types="spotify-api" />

import InstanceSkel = require('../../../instance_skel')
import { GetConfigFields, DeviceConfig } from './config'
import { FeedbackId, GetFeedbacksList } from './feedback'
import { DoAction, GetActionsList } from './actions'
import { CompanionStaticUpgradeScript, CompanionSystem, SomeCompanionConfigField } from '../../../instance_skel_types'
import PQueue from 'p-queue'
import { SpotifyPlaybackState, SpotifyState } from './state'
import { SpotifyInstanceBase } from './types'
import { BooleanFeedbackUpgradeMap } from './upgrades'
import { authorizationCodeGrant, GenerateAuthorizeUrl, refreshAccessToken, SpotifyAuth } from './api/auth'
import { getMyCurrentPlaybackState } from './api/playback'
import { RequestOptionsBase } from './api/util'

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

class SpotifyInstance extends InstanceSkel<DeviceConfig> implements SpotifyInstanceBase {
	public spotifyAuth: SpotifyAuth | undefined // TODO - use this more

	private pollTimer: NodeJS.Timeout | undefined

	private readonly state: SpotifyState
	private readonly pollQueue = new PQueue({ concurrency: 1 })

	constructor(system: CompanionSystem, id: string, config: DeviceConfig) {
		super(system, id, config)

		this.state = {
			playbackState: null,
		}
	}

	static GetUpgradeScripts(): CompanionStaticUpgradeScript[] {
		return [
			// Upgrade feedbacks to boolean type
			SpotifyInstance.CreateConvertToBooleanFeedbackUpgradeScript(BooleanFeedbackUpgradeMap),
		]
	}

	public async checkIfApiErrorShouldRetry(err: any): Promise<boolean> {
		// Error Code 401 represents out of date token
		if ('statusCode' in err && err.statusCode == '401') {
			if (!this.config.clientId || !this.config.clientSecret || !this.config.refreshToken) {
				this.debug(`Missing properties required to refresh access token`)

				this.applyConfigValues()
				return false
			}
			try {
				const data = await refreshAccessToken(this.config.clientId, this.config.clientSecret, this.config.refreshToken)
				if (data.body?.access_token) {
					// Save the new token
					this.config.accessToken = data.body.access_token
					this.saveConfig()

					this.applyConfigValues()
					return true
				} else {
					this.debug(`No access token in refresh response`)

					// Clear the stale token
					delete this.config.accessToken
					this.saveConfig()

					this.applyConfigValues()
					return false
				}
			} catch (e: any) {
				this.debug(`Failed to refresh access token: ${e.toString()}`)

				// Clear the stale token
				delete this.config.accessToken
				this.saveConfig()

				this.applyConfigValues()
				return false
			}
		} else {
			const errStr = 'error' in err ? err.error.toString() : err.toString()
			this.debug(`Something went wrong with an API Call: ${errStr}`)
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

			this.status(this.STATUS_OK)
		} else {
			this.spotifyAuth = undefined

			this.status(this.STATUS_ERROR, 'Missing required config fields')
		}
	}

	updateConfig(config: DeviceConfig): void {
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
					this.saveConfig()

					this.applyConfigValues()
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
			this.config.authURL = GenerateAuthorizeUrl(
				this.config.clientId,
				this.config.redirectUri,
				AUTH_SCOPES,
				''
			).toString()
			this.saveConfig()
		}

		this.initActions()
	}
	init(): void {
		this.status(this.STATUS_WARNING, 'Configuring')

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
					this.debug(`Could not refresh access token`, err)
					this.log('warn', `Failed to refresh access token: ${err.toString()}`)
				})
		}

		if (!this.pollTimer) {
			this.pollTimer = setInterval(() => this.queuePoll(), 1000) // Check every 0.25 seconds
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
	config_fields(): SomeCompanionConfigField[] {
		return GetConfigFields()
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
						this.debug(`Failed to execute action: ${e.toString()}`, e.stack)
						this.log('error', `Execute action failed: ${e.toString()}`)
					})
			}
		}

		const actions = GetActionsList(executeActionWrapper)
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
		return !!this.spotifyAuth
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
		if (Object.keys(variableUpdates).length > 0) this.setVariables(variableUpdates as any)
	}
}

export = SpotifyInstance
