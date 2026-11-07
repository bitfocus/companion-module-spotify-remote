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
	uri: string
	durationMs: number
	name: string
	artistName: string | null
	albumName: string | null
	albumImageUrl: string | null
	isInLibrary: boolean | 'unknown' | null
}

export interface SpotifyDeviceInfo {
	id: string | null
	name: string
	volumePercent: number | null
}
