//TODO:
// Clean up code, volume function, shuffle function, play function all in a different file. Startup and config function for setting all of the wrapper vars too
// Seek on transfer to fix skipping due to spotifty api being bad.
// Separate polling of data from variable state update to allow smoother status updates

import InstanceSkel = require('../../../instance_skel')
import SpotifyWebApi = require('spotify-web-api-node')
import { GetConfigFields, DeviceConfig } from './config'
import { GetFeedbacksList } from './feedback'
import { GetActionsList } from './actions'
import { CompanionSystem } from '../../../instance_skel_types'

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

class SpotifyInstance extends InstanceSkel<DeviceConfig> {
	private spotifyApi: SpotifyWebApi | undefined
	constructor(system: CompanionSystem, id: string, config: DeviceConfig) {
		super(system, id, config)
	}
	errorCheck(err) {
		let self = this
		//Error Code 401 represents out of date token
		if (err.statusCode == '401') {
			return self.spotifyApi.refreshAccessToken().then(
				function (data) {
					self.spotifyApi.setAccessToken(data.body['access_token'])
					return true
				},
				function (err) {
					console.log('Could not refresh access token', err)
					return false
				}
			)
		} else {
			console.log('Something went wrong with an API Call: ' + err)
			return Promise.resolve(false)
		}
	}
	ChangePlayState(action, device) {
		let self = this
		self.spotifyApi.getMyCurrentPlaybackState().then(
			function (data) {
				// Output items
				if (data.body && data.body.is_playing) {
					if (action.action == 'pause' || action.action == 'play/pause') {
						self.spotifyApi.pause().then(
							function () {
								self.PollPlaybackState()
							},
							function (err) {
								console.log('Something went wrong!', err)
							}
						)
					}
				} else {
					if (action.action == 'play' || action.action == 'play/pause') {
						self.spotifyApi
							.play({
								device_id: device,
							})
							.then(
								function () {
									self.PollPlaybackState()
								},
								function (err) {
									console.log('Something went wrong!', err)
								}
							)
					}
				}
			},
			function (err) {
				self.errorCheck(err).then(function (retry) {
					if (retry) {
						self.ChangePlayState(action)
					}
				})
			}
		)
	}
	PlaySpecific(action, device) {
		let self = this

		let params = {
			device_id: device,
		}

		if (action.action == 'playSpecificList') {
			params.context_uri = `spotify:${action.options.type}:${action.options.context_uri}`
		}

		if (action.action == 'playSpecificTracks') {
			let tracks = action.options.tracks.split(',')
			tracks = tracks.map((track) => 'spotify:track:' + track.trim())
			params.uris = tracks
		}

		self.spotifyApi.getMyCurrentPlaybackState().then(
			function (data) {
				if (data.body && data.body.context && data.body.context.uri === params.context_uri) {
					if (
						!action.options.behavior ||
						action.options.behavior == 'return' ||
						(action.options.behavior == 'resume' && data.body.is_playing)
					) {
						return this.log('warning', `Already playing that ${action.options.type}: ${action.options.context_uri}`)
					}

					if (action.options.behavior == 'resume') {
						return self.spotifyApi
							.play({
								device_id: device,
							})
							.then(
								function (res) {
									console.log('done')
									self.PollPlaybackState()
								},
								function (err) {
									console.log('Something went wrong!', err)
								}
							)
					}
				}

				self.spotifyApi.play(params).then(
					function (res) {
						console.log('done')
						self.PollPlaybackState()
					},
					function (err) {
						console.log('Something went wrong!', err)
					}
				)
			},
			function (err) {
				self.errorCheck(err).then(function (retry) {
					if (retry) {
						self.PlaySpecific(action)
					}
				})
			}
		)
	}
	ChangeShuffleState(action) {
		let self = this
		self.spotifyApi.getMyCurrentPlaybackState().then(
			function (data) {
				if (data.body && data.body.shuffle_state) {
					if (action.action == 'shuffleOff' || action.action == 'shuffleToggle') {
						self.spotifyApi.setShuffle(false).then(
							function () {
								self.PollPlaybackState()
							},
							function (err) {
								self.errorCheck(err).then(function (retry) {
									if (retry) {
										self.ChangeShuffleState(action)
									}
								})
							}
						)
					}
				} else {
					if (action.action == 'shuffleOn' || action.action == 'shuffleToggle') {
						self.spotifyApi.setShuffle(true).then(
							function () {
								self.PollPlaybackState()
							},
							function (err) {
								self.errorCheck(err).then(function (retry) {
									if (retry) {
										self.ChangeShuffleState(action)
									}
								})
							}
						)
					}
				}
			},
			function (err) {
				self.errorCheck(err).then(function (retry) {
					if (retry) {
						self.ChangeShuffleState(action)
					}
				})
			}
		)
	}
	ChangeRepeatState(action) {
		let self = this
		self.spotifyApi.getMyCurrentPlaybackState().then(
			function (data) {
				let currentState = data.body.repeat_state

				if (action.options.state == currentState) {
					console.log('Selected repeat state is already current')
					return
				}

				self.spotifyApi.setRepeat(action.options.state).then(
					function () {
						self.PollPlaybackState()
					},
					function (err) {
						self.errorCheck(err).then(function (retry) {
							if (retry) {
								self.ChangeRepeatState(action)
							}
						})
					}
				)
			},
			function (err) {
				self.errorCheck(err).then(function (retry) {
					if (retry) {
						self.ChangeRepeatState(action)
					}
				})
			}
		)
	}
	SeekPosition(action) {
		let self = this
		let ms = action.options.position

		self.spotifyApi.seek(ms).then(
			function () {
				self.PollPlaybackState()
			},
			function (err) {
				self.errorCheck(err).then(function (retry) {
					if (retry) {
						self.SeekPosition(action)
					}
				})
			}
		)
	}
	ChangeVolume(action, device, specific = false) {
		let self = this
		let availableDevices
		let currentVolume
		let volumeChangable = true
		self.spotifyApi.getMyDevices().then(
			function (data) {
				availableDevices = data.body.devices

				for (i = 0; i < availableDevices.length; i++) {
					if (availableDevices[i].id == device) {
						if (availableDevices[i].type == 'Tablet' || availableDevices[i].type == 'Phone') {
							volumeChangable = false
						}
						currentVolume = availableDevices[i].volume_percent
					}
				}
				if (volumeChangable && !specific) {
					if (action.action == 'volumeUp') {
						currentVolume = currentVolume - -action.options.volumeUpAmount //double negitive because JS things
						if (currentVolume > 100) {
							currentVolume = 100
						}
					} else {
						currentVolume = currentVolume - action.options.volumeDownAmount
						if (currentVolume < 0) {
							currentVolume = 0
						}
					}
				}

				if (specific) {
					currentVolume = action.options.value
				}

				self.spotifyApi
					.setVolume(currentVolume, {
						device_id: device,
					})
					.then(
						function () {},
						function (err) {
							self.errorCheck(err)
						}
					)
			},
			function (err) {
				self.errorCheck(err).then(function (retry) {
					if (retry) {
						self.ChangeVolume(action)
					}
				})
			}
		)
	}
	SkipSong() {
		let self = this
		self.spotifyApi.skipToNext().then(
			function () {},
			function (err) {
				self.errorCheck(err).then(function (retry) {
					if (retry) {
						self.SkipSong()
					}
				})
			}
		)
	}
	PreviousSong() {
		let self = this
		self.spotifyApi.skipToPrevious().then(
			function () {},
			function (err) {
				self.errorCheck(err).then(function (retry) {
					if (retry) {
						self.PreviousSong()
					}
				})
			}
		)
	}
	TransferPlayback(id) {
		let self = this
		id = [id]
		self.spotifyApi
			.transferMyPlayback(id, {
				play: true,
			})
			.then(
				function () {
					self.PollPlaybackState()
				},
				function (err) {
					self.errorCheck(err).then(function (retry) {
						if (retry) {
							self.TransferPlayback(id)
						}
					})
				}
			)
	}
	PollPlaybackState() {
		let self = this
		self.spotifyApi.getMyCurrentPlaybackState().then(
			function (data) {
				if (data.body) {
					if (data.body.is_playing) {
						self.MusicPlaying = true
						self.MusicPlayingIcon = '\u23F5'
						self.checkFeedbacks('is-playing')
					}
					if (!data.body.is_playing) {
						self.MusicPlaying = false
						self.MusicPlayingIcon = '\u23F9'
						self.checkFeedbacks('is-playing')
					}

					if (data.body.shuffle_state) {
						self.ShuffleOn = true
						self.checkFeedbacks('is-shuffle')
					}
					if (!data.body.shuffle_state) {
						self.ShuffleOn = false
						self.checkFeedbacks('is-shuffle')
					}

					self.RepeatState = data.body.repeat_state
					self.checkFeedbacks('is-repeat')

					if (data.body.context) {
						self.CurrentContext = data.body.context.uri.split(':')[2]
					} else {
						self.CurrentContext = null
					}

					self.checkFeedbacks('current-context')
				}

				let songProgress = 0
				let songDuration = 0
				let songPercentage = 0
				let timeRemaining = 0
				let songName = ''
				let albumName = ''
				let artistName = ''
				let albumArt = ''

				if (data.body.item) {
					songProgress = data.body.progress_ms
					songDuration = data.body.item.duration_ms
					songPercentage = songProgress / songDuration

					songPercentage = songPercentage * 100
					songPercentage = songPercentage.toFixed(0)

					songProgress = songProgress / 1000
					songProgress = songProgress.toFixed(0)

					songDuration = songDuration / 1000
					songDuration = songDuration.toFixed(0)

					timeRemaining = songDuration - songProgress
					timeRemaining = new Date(timeRemaining * 1000).toISOString().substr(11, 8)

					songName = data.body.item.name
					albumName = data.body.item.album.name
					artistName = data.body.item.artists[0].name
					if (data.body.item.album && data.body.item.album.images.length) albumArt = data.body.item.album.images[0].url
				} else {
					timeRemaining = new Date(0).toISOString().substr(11, 8)
				}

				let timeRemainingSplit = timeRemaining.split(':')
				let hoursRemaining = timeRemainingSplit[0]
				let minutesRemaining = timeRemainingSplit[1]
				let secondsRemaining = timeRemainingSplit[2]

				let deviceVolume = 0
				if (data.body.device) {
					deviceVolume = data.body.device.volume_percent
					self.ActiveDevice = data.body.device.name
					self.checkFeedbacks('active-device')
				}

				self.setVariable('songName', songName)
				self.setVariable('albumName', albumName)
				self.setVariable('artistName', artistName)
				self.setVariable('isPlaying', self.MusicPlaying)
				self.setVariable('isPlayingIcon', self.MusicPlayingIcon)
				self.setVariable('isShuffle', self.ShuffleOn)
				self.setVariable('repeat', self.RepeatState)
				self.setVariable('currentContext', self.CurrentContext)
				self.setVariable('songPercentage', songPercentage)
				self.setVariable('songProgressSeconds', songProgress)
				self.setVariable('songDurationSeconds', songDuration)
				self.setVariable('songTimeRemaining', timeRemaining)
				self.setVariable('songTimeRemainingHours', hoursRemaining)
				self.setVariable('songTimeRemainingMinutes', minutesRemaining)
				self.setVariable('songTimeRemainingSeconds', secondsRemaining)
				self.setVariable('volume', deviceVolume)
				self.setVariable('currentAlbumArt', albumArt)
				self.setVariable('deviceName', self.ActiveDevice)
			},
			function (err) {
				self.errorCheck(err).then(function (retry) {
					if (retry) {
						self.PollPlaybackState()
					}
				})
			}
		)
	}
	updateConfig(config) {
		let self = this

		self.config = config
		self.spotifyApi.setClientId(self.config.clientId)
		self.spotifyApi.setClientSecret(self.config.clientSecret)
		self.spotifyApi.setRedirectURI(self.config.redirectUri)
		if (self.config.code && !self.config.accessToken) {
			self.spotifyApi.authorizationCodeGrant(self.config.code).then(
				function (data) {
					self.config.accessToken = data.body['access_token']
					self.config.refreshToken = data.body['refresh_token']
					self.saveConfig()

					// Set the access token on the API object to use it in later calls
					self.spotifyApi.setAccessToken(data.body['access_token'])
					self.spotifyApi.setRefreshToken(data.body['refresh_token'])
				},
				function (err) {
					self.errorCheck(err)
				}
			)
		}
		if (
			self.config.redirectUri &&
			self.config.clientSecret &&
			self.config.clientId &&
			!self.config.accessToken &&
			!self.config.code
		) {
			self.config.authURL = self.spotifyApi.createAuthorizeURL(scopes)
			self.saveConfig()
		}
		if (self.config.accessToken) {
			self.spotifyApi.setAccessToken(self.config.accessToken)
		}
		if (self.config.refreshToken) {
			self.spotifyApi.setRefreshToken(self.config.refreshToken)
		}

		self.initActions()
	}
	init() {
		let self = this

		self.status(self.STATUS_WARNING, 'Configuring')

		let spotifyApi = new SpotifyWebApi()
		self.spotifyApi = spotifyApi
		if (self.config.clientId) {
			self.spotifyApi.setClientId(self.config.clientId)
		}
		if (self.config.clientSecret) {
			self.spotifyApi.setClientSecret(self.config.clientSecret)
		}
		if (self.config.redirectUri) {
			self.spotifyApi.setRedirectURI(self.config.redirectUri)
		}
		if (self.config.accessToken) {
			self.spotifyApi.setAccessToken(self.config.accessToken)
		}
		if (self.config.refreshToken) {
			self.spotifyApi.setRefreshToken(self.config.refreshToken)
		}

		self.spotifyApi.refreshAccessToken().then(
			function (data) {
				// Save the access token so that it's used in future calls
				self.spotifyApi.setAccessToken(data.body['access_token'])
			},
			function (err) {
				console.log('Could not refresh access token', err)
			}
		)

		if (self.Timer === undefined) {
			self.Timer = setInterval(self.DoPoll.bind(self), 250) //Check every 0.25 seconds
		}

		self.initActions()
		self.initFeedbacks()
		self.initVariables()
		debug = self.debug
		log = self.log
	}
	DoPoll() {
		let self = this

		// If everything is populated we can do the poll
		if (
			self.spotifyApi.getClientId() &&
			self.spotifyApi.getAccessToken() &&
			self.spotifyApi.getClientSecret() &&
			self.spotifyApi.getRefreshToken()
		) {
			self.status(self.STATUS_OK)

			self.PollPlaybackState()
		} else {
			self.status(self.STATUS_ERROR, 'Missing required config fields')
		}
	}
	StopTimer() {
		let self = this

		if (self.Timer) {
			clearInterval(self.Timer)
			delete self.Timer
		}
	}
	destroy() {
		let self = this
		self.StopTimer()
		this.debug('destroy')
	}
	config_fields() {
		return GetConfigFields()
	}
	initActions() {
		let self = this

		const actions = GetActionsList(self)
		self.setActions(actions)
	}
	// Set up Feedbacks
	initFeedbacks() {
		let self = this

		const feedbacks = GetFeedbacksList(this, () => this.state)
		self.setFeedbackDefinitions(feedbacks)
	}
	initVariables() {
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
	action(action) {
		let self = this

		if (action.action == 'play/pause' || action.action == 'play' || action.action == 'pause') {
			self.ChangePlayState(action, self.config.deviceId)
		}

		if (action.action == 'playSpecificList' || action.action == 'playSpecificTracks') {
			self.PlaySpecific(action, self.config.deviceId)
		}

		if (action.action == 'shuffleToggle' || action.action == 'shuffleOn' || action.action == 'shuffleOff') {
			self.ChangeShuffleState(action)
		}

		if (action.action == 'repeatState') {
			self.ChangeRepeatState(action)
		}

		if (action.action == 'volumeUp' || action.action == 'volumeDown') {
			self.ChangeVolume(action, self.config.deviceId)
		}

		if (action.action == 'volumeSpecific') {
			self.ChangeVolume(action, self.config.deviceId, true)
		}

		if (action.action == 'seekPosition') {
			self.SeekPosition(action, self.config.position)
		}

		if (action.action == 'skip') {
			self.SkipSong()
		}

		if (action.action == 'previous') {
			self.PreviousSong()
		}

		if (action.action == 'activeDeviceToConfig') {
			self.spotifyApi.getMyDevices().then(
				function (data) {
					let availableDevices = data.body.devices
					for (let i = 0; i < availableDevices.length; i++) {
						if (availableDevices[i].is_active) {
							self.config.deviceId = availableDevices[i].id
							self.saveConfig()
						}
					}
				},
				function (err) {
					console.log('Something went wrong!', err)
				}
			)
		}

		if (action.action == 'switchActiveDevice') {
			let Id = action.options.deviceId
			self.config.deviceId = Id
			self.saveConfig()
			self.TransferPlayback(self.config.deviceId)
		}
	}
}

export = SpotifyInstance
