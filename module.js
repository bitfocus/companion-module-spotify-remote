//TODO:
// Clean up code, volume function, shuffle function, play function all in a different file. Startup and config function for setting all of the wrapper vars too
// Seek on transfer to fix skipping due to spotifty api being bad.

var instance_skel = require('../../instance_skel')
var SpotifyWebApi = require('spotify-web-api-node')
const { StepFunctions } = require('aws-sdk')

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

function instance(system, id, config) {
	var self = this
	self.spotifyApi = null
	// super-constructor
	instance_skel.apply(this, arguments)

	self.actions() // export actions

	return self
}

instance.prototype.errorCheck = function (err) {
	var self = this
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

instance.prototype.ChangePlayState = function (action, device) {
	var self = this
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

instance.prototype.PlaySpecific = function (action, device) {
	var self = this

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

instance.prototype.ChangeShuffleState = function (action) {
	var self = this
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

instance.prototype.ChangeRepeatState = function (action) {
	var self = this
	self.spotifyApi.getMyCurrentPlaybackState().then(
		function (data) {
			var currentState = data.body.repeat_state

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

instance.prototype.ChangeVolume = function (action, device, specific = false) {
	var self = this
	var availableDevices
	var currentVolume
	var volumeChangable = true
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

instance.prototype.SkipSong = function () {
	var self = this
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

instance.prototype.PreviousSong = function () {
	var self = this
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

instance.prototype.TransferPlayback = function (id) {
	var self = this
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

instance.prototype.PollPlaybackState = function () {
	var self = this
	self.spotifyApi.getMyCurrentPlaybackState().then(
		function (data) {
			// console.log(data.body)
			if (data.body) {
				if (data.body.is_playing) {
					self.MusicPlaying = true
					self.checkFeedbacks('is-playing')
				}
				if (!data.body.is_playing) {
					self.MusicPlaying = false
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
			}

			var songProgress = 0
			var songDuration = 0
			var songPercentage = 0
			var songName = ''
			var albumName = ''
			var artistName = ''
			var albumArt = ''

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

				songName = data.body.item.name
				albumName = data.body.item.album.name
				artistName = data.body.item.artists[0].name
				albumArt = data.body.item.album.images[0].url
			}

			var deviceVolume = 0
			if (data.body.device) {
				deviceVolume = data.body.device.volume_percent
				self.ActiveDevice = data.body.device.name
				self.checkFeedbacks('active-device')
			}

			self.setVariable('songName', songName)
			self.setVariable('albumName', albumName)
			self.setVariable('artistName', artistName)
			self.setVariable('isPlaying', self.MusicPlaying)
			self.setVariable('isShuffle', self.ShuffleOn)
			self.setVariable('repeat', self.RepeatState)
			self.setVariable('songPercentage', songPercentage)
			self.setVariable('songProgressSeconds', songProgress)
			self.setVariable('songDurationSeconds', songDuration)
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

instance.prototype.updateConfig = function (config) {
	var self = this

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

	self.actions()
}

instance.prototype.init = function () {
	var self = this

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

	self.initFeedbacks()
	self.initVariables()
	debug = self.debug
	log = self.log
}

instance.prototype.DoPoll = function () {
	var self = this

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

instance.prototype.StopTimer = function () {
	var self = this

	if (self.Timer) {
		clearInterval(self.Timer)
		delete self.Timer
	}
}

instance.prototype.destroy = function () {
	var self = this
	self.StopTimer()
	debug('destroy')
}

instance.prototype.config_fields = function () {
	var self = this
	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Setup Information',
			value: '<strong>PLEASE READ THE HELP FILE.</strong> (Question mark in the top right)',
		},
		{
			type: 'textinput',
			id: 'clientId',
			width: 12,
			label: 'Client ID',
		},
		{
			type: 'textinput',
			id: 'clientSecret',
			width: 12,
			label: 'Client Secret',
		},
		{
			type: 'textinput',
			id: 'redirectUri',
			width: 12,
			label: 'Redirect URL',
		},
		{
			type: 'textinput',
			id: 'code',
			width: 12,
			label: 'Approval Code',
		},
		{
			type: 'textinput',
			id: 'accessToken',
			width: 12,
			label: 'Access Token',
		},
		{
			type: 'textinput',
			id: 'refreshToken',
			width: 12,
			label: 'Refresh Token',
		},
		{
			type: 'textinput',
			id: 'deviceId',
			width: 12,
			label: 'Device ID',
		},
		{
			type: 'textinput',
			id: 'authURL',
			width: 12,
			label: 'Auth URL',
		},
	]
}

instance.prototype.actions = function (system) {
	var self = this

	self.setActions({
		'play/pause': {
			label: 'Toggle Play/Pause',
		},
		play: {
			label: 'Play',
		},
		playSpecificList: {
			label: 'Start Specific Playlist',
			options: [
				{
					id: 'type',
					type: 'dropdown',
					required: true,
					choices: [
						{ id: 'album', label: 'Album' },
						{ id: 'artist', label: 'Artist' },
						{ id: 'playlist', label: 'Playlist' },
					],
				},
				{
					tooltip: 'Provide the ID for the item',
					required: true,
					type: 'textinput',
					label: 'Item ID',
					id: 'context_uri',
				},
				{
					type: 'dropdown',
					default: 'return',
					label: 'Action Behavior if Provided Item is Currently Playing',
					id: 'behavior',
					choices: [
						{ id: 'return', label: 'Do Nothing' },
						{ id: 'resume', label: 'Play (if paused)' },
						{ id: 'force', label: 'Force Play (from start)' },
					],
				},
			],
		},
		playSpecificTracks: {
			label: 'Start Specific Track(s)',
			tooltip: 'IDs should be comma separated (ie. 4ByEFOBuLXpCqvO1kw8Wdm,7BaEFOBuLXpDqvO1kw8Wem)',
			options: [
				{
					id: 'tracks',
					type: 'textinput',
					required: true,
					label: 'Input Specific Track IDs',
				},
			],
		},
		pause: {
			label: 'Pause Playback',
		},
		volumeUp: {
			label: 'Volume Up',
			options: [
				{
					type: 'textinput',
					label: 'Volume',
					id: 'volumeUpAmount',
					default: '5',
				},
			],
		},
		volumeDown: {
			label: 'Volume Down',
			options: [
				{
					type: 'textinput',
					label: 'Volume',
					id: 'volumeDownAmount',
					default: '5',
				},
			],
		},
		volumeSpecific: {
			label: 'Set Volume to Specific Value',
			options: [
				{
					type: 'textinput',
					label: 'Volume',
					id: 'value',
					default: '50',
				},
			],
		},
		skip: {
			label: 'Skip Track',
		},
		previous: {
			label: 'Previous Track',
		},
		shuffleToggle: {
			label: 'Toggle Shuffle',
		},
		shuffleOn: {
			label: 'Turn Shuffle On',
		},
		shuffleOff: {
			label: 'Turn Shuffle Off',
		},
		repeatState: {
			label: 'Set Repeat State',
			options: [
				{
					type: 'dropdown',
					label: 'State',
					id: 'state',
					default: 'off',
					choices: [
						{
							id: 'off',
							label: 'off',
						},
						{
							id: 'context',
							label: 'context',
						},
						{
							id: 'track',
							label: 'track',
						},
					],
				},
			],
		},
		activeDeviceToConfig: {
			label: 'Write the ID of the current Active Device to config',
		},
		switchActiveDevice: {
			label: 'Change Active Device',
			options: [
				{
					type: 'textinput',
					label: 'Device ID',
					id: 'deviceId',
					default: '',
				},
			],
		},
	})
}

instance.prototype.Timer = undefined

// Set up Feedbacks
instance.prototype.initFeedbacks = function () {
	var self = this

	// feedbacks
	var feedbacks = {}

	feedbacks['is-playing'] = {
		label: 'Change button colour if music is playing',
		description: 'If there is active playback, set the button to this colour',
		options: [
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg',
				default: self.rgb(255, 255, 255),
			},
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg',
				default: self.rgb(0, 255, 0),
			},
		],
	}

	feedbacks['is-shuffle'] = {
		label: 'Change button colour if shuffle is turned on',
		description: 'If shuffle is enabled, set the button to this colour',
		options: [
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg',
				default: self.rgb(255, 255, 255),
			},
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg',
				default: self.rgb(0, 255, 0),
			},
		],
	}

	feedbacks['is-repeat'] = {
		label: 'Change button color based on repeat state',
		description: 'If repeat state matches given state change button colors',
		options: [
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg',
				default: self.rgb(255, 255, 255),
			},
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg',
				default: self.rgb(0, 255, 0),
			},
			{
				type: 'dropdown',
				label: 'Repeat state to match',
				id: 'type',
				default: 'track',
				choices: [
					{
						label: 'off',
						id: 'off',
					},
					{
						label: 'context',
						id: 'context',
					},
					{
						label: 'track',
						id: 'track',
					},
				],
			},
		],
	}

	feedbacks['active-device'] = {
		label: 'Change button colour if active device name matches value',
		description: 'If active device name matches value, change button color',
		options: [
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg',
				default: self.rgb(255, 255, 255),
			},
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg',
				default: self.rgb(0, 255, 0),
			},
			{
				type: 'textinput',
				label: 'Device Name (case insensitive)',
				id: 'device',
			},
		],
	}

	self.setFeedbackDefinitions(feedbacks)
}

instance.prototype.initVariables = function () {
	var self = this

	var variables = []

	variables.push({
		name: 'songName',
		label: 'Current Song Name',
	})
	variables.push({
		name: 'albumName',
		label: 'Current Album Name',
	})
	variables.push({
		name: 'artistName',
		label: 'Current Artist Name',
	})
	variables.push({
		name: 'isPlaying',
		label: 'Is Playback Active',
	})
	variables.push({
		name: 'isShuffle',
		label: 'Is Shuffle Enabled',
	})
	variables.push({
		name: 'repeat',
		label: 'Is Repeat Enabled',
	}) // SOmething to do with repeating here
	variables.push({
		name: 'songPercentage',
		label: 'Percentage of the current song completed',
	})
	variables.push({
		name: 'songProgressSeconds',
		label: 'Progress of the current song in seconds',
	})
	variables.push({
		name: 'songDurationSeconds',
		label: 'Duration of the current song in seconds',
	})
	variables.push({
		name: 'volume',
		label: 'Current Volume',
	})
	variables.push({
		name: 'currentAlbumArt',
		label: 'Currently playing album artwork',
	})
	variables.push({
		name: 'deviceName',
		label: 'Current device name',
	})

	self.setVariableDefinitions(variables)
}

instance.prototype.action = function (action) {
	var self = this

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
				for (var i = 0; i < availableDevices.length; i++) {
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
		var Id = action.options.deviceId
		self.config.deviceId = Id
		self.saveConfig()
		self.TransferPlayback(self.config.deviceId)
	}
}

instance.prototype.feedback = function (feedback, bank) {
	var self = this
	if (feedback.type === 'is-playing') {
		if (self.MusicPlaying) {
			return {
				color: feedback.options.fg,
				bgcolor: feedback.options.bg,
			}
		}
	}
	if (feedback.type === 'is-shuffle') {
		if (self.ShuffleOn) {
			return {
				color: feedback.options.fg,
				bgcolor: feedback.options.bg,
			}
		}
	}
	if (feedback.type === 'is-repeat') {
		if (self.RepeatState == feedback.options.type) {
			return {
				color: feedback.options.fg,
				bgcolor: feedback.options.bg,
			}
		}
	}
	if (feedback.type === 'active-device') {
		if (self.ActiveDevice.toLowerCase() == feedback.options.device.toLowerCase()) {
			return {
				color: feedback.options.fg,
				bgcolor: feedback.options.bg,
			}
		}
	}
}

instance_skel.extendedBy(instance)
exports = module.exports = instance
