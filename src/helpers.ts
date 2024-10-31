import { getMyDevices, setVolume } from './api/device.js'
import {
	addItemToQueue,
	getMyCurrentPlaybackState,
	pause,
	play,
	seek,
	setRepeat,
	setShuffle,
	skipToNext,
	skipToPrevious,
	transferMyPlayback,
} from './api/playback.js'
import { SpotifyInstanceBase } from './types.js'

// Limit the number of retries that we do
const MAX_ATTEMPTS = 5

export async function ChangeVolume(
	instance: SpotifyInstanceBase,
	deviceId: string,
	absolute: boolean,
	volumeOrDelta: number,
	attempt = 0,
): Promise<void> {
	const reqOptions = instance.getRequestOptionsBase()
	if (!reqOptions) return

	if (isNaN(volumeOrDelta)) {
		instance.log('debug', `Invalid volume change: ${volumeOrDelta} isAbsolute=${absolute}`)
		return
	}

	try {
		const data = await getMyDevices(reqOptions)
		const selectedDevice = data.body?.devices?.find((dev) => dev.id === deviceId)
		// TODO - if dev.type == 'Tablet' || dev.type == 'Phone', then we can't do increments? or should that have been set the volume at all?

		// Device doesn't look valid
		if (!selectedDevice || typeof selectedDevice.volume_percent !== 'number') return

		let newVolume = absolute ? volumeOrDelta : selectedDevice.volume_percent + volumeOrDelta
		if (newVolume < 0) newVolume = 0
		if (newVolume > 100) newVolume = 100

		await setVolume(reqOptions, newVolume, { deviceId })
	} catch (err) {
		const retry = await instance.checkIfApiErrorShouldRetry(err)
		if (retry && attempt <= MAX_ATTEMPTS) {
			return ChangeVolume(instance, deviceId, absolute, volumeOrDelta, attempt + 1)
		} else {
			throw err
		}
	}
}

export async function QueueItem(
	instance: SpotifyInstanceBase,
	deviceId: string,
	context_uri: string,
	attempt = 0,
): Promise<void> {
	const reqOptions = instance.getRequestOptionsBase()
	if (!reqOptions) return

	try {
		await addItemToQueue(reqOptions, context_uri, { deviceId })
	} catch (err) {
		const retry = await instance.checkIfApiErrorShouldRetry(err)
		if (retry && attempt <= MAX_ATTEMPTS) {
			return QueueItem(instance, deviceId, context_uri, attempt + 1)
		} else {
			throw err
		}
	}
}

export async function SkipSong(instance: SpotifyInstanceBase, deviceId: string, attempt = 0): Promise<void> {
	const reqOptions = instance.getRequestOptionsBase()
	if (!reqOptions) return

	try {
		await skipToNext(reqOptions, { deviceId })
	} catch (err) {
		const retry = await instance.checkIfApiErrorShouldRetry(err)
		if (retry && attempt <= MAX_ATTEMPTS) {
			return SkipSong(instance, deviceId, attempt + 1)
		} else {
			throw err
		}
	}
}
export async function PreviousSong(instance: SpotifyInstanceBase, deviceId: string, attempt = 0): Promise<void> {
	const reqOptions = instance.getRequestOptionsBase()
	if (!reqOptions) return

	try {
		await skipToPrevious(reqOptions, { deviceId })
	} catch (err) {
		const retry = await instance.checkIfApiErrorShouldRetry(err)
		if (retry && attempt <= MAX_ATTEMPTS) {
			return PreviousSong(instance, deviceId, attempt + 1)
		} else {
			throw err
		}
	}
}

export async function TransferPlayback(instance: SpotifyInstanceBase, deviceId: string, attempt = 0): Promise<void> {
	const reqOptions = instance.getRequestOptionsBase()
	if (!reqOptions) return

	try {
		await transferMyPlayback(reqOptions, [deviceId], {
			play: true,
		})
	} catch (err) {
		const retry = await instance.checkIfApiErrorShouldRetry(err)
		if (retry && attempt <= MAX_ATTEMPTS) {
			return TransferPlayback(instance, deviceId, attempt + 1)
		} else {
			throw err
		}
	}
}

export async function ChangePlayState(
	instance: SpotifyInstanceBase,
	deviceId: string,
	action: 'play' | 'pause' | 'toggle',
	attempt = 0,
): Promise<void> {
	const reqOptions = instance.getRequestOptionsBase()
	if (!reqOptions) return

	try {
		const data = await getMyCurrentPlaybackState(reqOptions)

		if ((action === 'pause' || action === 'toggle') && data.body?.is_playing) {
			await pause(reqOptions, { deviceId })
		} else if ((action === 'play' || action === 'toggle') && !data.body?.is_playing) {
			await play(reqOptions, { deviceId })
		}
	} catch (err) {
		const retry = await instance.checkIfApiErrorShouldRetry(err)
		if (retry && attempt <= MAX_ATTEMPTS) {
			return ChangePlayState(instance, deviceId, action, attempt + 1)
		} else {
			throw err
		}
	}
}

export async function ChangeRepeatState(
	instance: SpotifyInstanceBase,
	deviceId: string,
	target: 'off' | 'track' | 'context',
	attempt = 0,
): Promise<void> {
	const reqOptions = instance.getRequestOptionsBase()
	if (!reqOptions) return

	try {
		// Check if already in desired state
		const data = await getMyCurrentPlaybackState(reqOptions)
		if (data.body?.repeat_state === target) return

		await setRepeat(reqOptions, target)
	} catch (err) {
		const retry = await instance.checkIfApiErrorShouldRetry(err)
		if (retry && attempt <= MAX_ATTEMPTS) {
			return ChangeRepeatState(instance, deviceId, target, attempt + 1)
		} else {
			throw err
		}
	}
}

export async function ChangeShuffleState(
	instance: SpotifyInstanceBase,
	deviceId: string,
	target: boolean | 'toggle',
	attempt = 0,
): Promise<void> {
	const reqOptions = instance.getRequestOptionsBase()
	if (!reqOptions) return

	try {
		const data = await getMyCurrentPlaybackState(reqOptions)

		if ((target === false || target === 'toggle') && data.body?.shuffle_state) {
			await setShuffle(reqOptions, false, { deviceId })
		} else if ((target === true || target === 'toggle') && !data.body?.shuffle_state) {
			await setShuffle(reqOptions, true, { deviceId })
		}
	} catch (err) {
		const retry = await instance.checkIfApiErrorShouldRetry(err)
		if (retry && attempt <= MAX_ATTEMPTS) {
			return ChangeShuffleState(instance, deviceId, target, attempt + 1)
		} else {
			throw err
		}
	}
}

export async function SeekPosition(
	instance: SpotifyInstanceBase,
	deviceId: string,
	positionMs: number,
	attempt = 0,
): Promise<void> {
	const reqOptions = instance.getRequestOptionsBase()
	if (!reqOptions) return

	try {
		await seek(reqOptions, positionMs)
	} catch (err) {
		const retry = await instance.checkIfApiErrorShouldRetry(err)
		if (retry && attempt <= MAX_ATTEMPTS) {
			return SeekPosition(instance, deviceId, positionMs, attempt + 1)
		} else {
			throw err
		}
	}
}

export async function PlaySpecificList(
	instance: SpotifyInstanceBase,
	deviceId: string,
	context_uri: string,
	behavior: 'return' | 'resume' | 'force',
	attempt = 0,
): Promise<void> {
	const reqOptions = instance.getRequestOptionsBase()
	if (!reqOptions) return

	try {
		if (behavior !== 'force') {
			const data = await getMyCurrentPlaybackState(reqOptions)
			if (data.body?.context?.uri === context_uri) {
				if (behavior == 'return' || (behavior == 'resume' && data.body.is_playing)) {
					instance.log('warn', `Already playing that ${context_uri}`)
				} else if (behavior == 'resume') {
					await play(reqOptions, { deviceId })
				}

				return
			}
		}
		await play(reqOptions, {
			deviceId,
			context_uri,
		})
	} catch (err) {
		const retry = await instance.checkIfApiErrorShouldRetry(err)
		if (retry && attempt <= MAX_ATTEMPTS) {
			return PlaySpecificList(instance, deviceId, context_uri, behavior, attempt + 1)
		} else {
			throw err
		}
	}
}

export async function PlaySpecificTracks(
	instance: SpotifyInstanceBase,
	deviceId: string,
	uris: string[],
	positionMs: number,
	attempt = 0,
): Promise<void> {
	const reqOptions = instance.getRequestOptionsBase()
	if (!reqOptions) return

	try {
		await play(reqOptions, {
			deviceId: deviceId,
			uris: uris,
			position_ms: positionMs,
		})
	} catch (err) {
		const retry = await instance.checkIfApiErrorShouldRetry(err)
		if (retry && attempt <= MAX_ATTEMPTS) {
			return PlaySpecificTracks(instance, deviceId, uris, positionMs, attempt + 1)
		} else {
			throw err
		}
	}
}
