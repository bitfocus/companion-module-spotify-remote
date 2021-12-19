export interface SpotifyState {
	playbackState: SpotifyPlaybackState | null
}

export interface SpotifyPlaybackState {
	isPlaying: boolean
	isShuffle: boolean
	repeatState: 'off' | 'track' | 'context'
	currentContext: string | null

	trackProgressMs: number
	trackInfo: SpotifyTrackInfo | null

	deviceInfo: SpotifyDeviceInfo | null
}

export interface SpotifyTrackInfo {
	durationMs: number
	name: string
	artistName: string | null
	albumName: string | null
	albumImageUrl: string | null
}

export interface SpotifyDeviceInfo {
	id: string | null
	name: string
	volumePercent: number | null
}
