import { setIntervalAsync, clearIntervalAsync } from 'set-interval-async/dynamic'
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

export async function GetCurrentVolume(instance: SpotifyInstanceBase, deviceId: string, attempt = 0): Promise<number> {
	const reqOptions = instance.getRequestOptionsBase()
	if (!reqOptions) return 0

	try {
		const data = await getMyDevices(reqOptions)
		const selectedDevice = data.body?.devices?.find((dev) => dev.id === deviceId)
		const volume = selectedDevice?.volume_percent ?? 0
		instance.setVariableValues({ volume: volume })
		return volume
	} catch (err) {
		const retry = await instance.checkIfApiErrorShouldRetry(err)
		if (retry && attempt <= MAX_ATTEMPTS) {
			return GetCurrentVolume(instance, deviceId, attempt + 1)
		} else {
			throw err
		}
	}
}

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
		await GetCurrentVolume(instance, deviceId)
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
	fadeOut = false,
	fadeIn = false,
	startVolume = 0,
	targetVolume = 85,
	fadeDurationMs = 5000,
	attempt = 0,
): Promise<void> {
	const reqOptions = instance.getRequestOptionsBase()
	if (!reqOptions) return

	try {
		const data = await getMyCurrentPlaybackState(reqOptions)

		if ((action === 'pause' || action === 'toggle') && data.body?.is_playing) {
			if (fadeOut) {
				await FadeVolume(instance, deviceId, 0, Number(fadeDurationMs))
			}
			await pause(reqOptions, { deviceId })
		} else if ((action === 'play' || action === 'toggle') && !data.body?.is_playing) {
			if (fadeIn) {
				await ChangeVolume(instance, deviceId, true, Number(startVolume))
				await GetCurrentVolume(instance, deviceId)
			}
			await play(reqOptions, { deviceId })

			if (fadeIn) {
				await FadeVolume(instance, deviceId, Number(targetVolume), Number(fadeDurationMs))
			}
		}
	} catch (err) {
		const retry = await instance.checkIfApiErrorShouldRetry(err)
		if (retry && attempt <= MAX_ATTEMPTS) {
			return ChangePlayState(
				instance,
				deviceId,
				action,
				fadeOut,
				fadeIn,
				startVolume,
				targetVolume,
				fadeDurationMs,
				attempt + 1,
			)
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
	fadeIn = false,
	startVolume = 0,
	targetVolume = 85,
	fadeDurationMs = 5000,
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
					if (fadeIn) {
						await ChangeVolume(instance, deviceId, true, Number(startVolume))
						await GetCurrentVolume(instance, deviceId)
					}
					await play(reqOptions, { deviceId })
					if (fadeIn) {
						await FadeVolume(instance, deviceId, Number(targetVolume), Number(fadeDurationMs))
					}
				}

				return
			}
		}

		if (fadeIn) {
			await ChangeVolume(instance, deviceId, true, Number(startVolume))
			await GetCurrentVolume(instance, deviceId)
		}
		await play(reqOptions, {
			deviceId,
			context_uri,
		})
		if (fadeIn) {
			await FadeVolume(instance, deviceId, Number(targetVolume), Number(fadeDurationMs))
		}
	} catch (err) {
		const retry = await instance.checkIfApiErrorShouldRetry(err)
		if (retry && attempt <= MAX_ATTEMPTS) {
			return PlaySpecificList(
				instance,
				deviceId,
				context_uri,
				behavior,
				fadeIn,
				startVolume,
				targetVolume,
				fadeDurationMs,
				attempt + 1,
			)
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
	fadeIn = false,
	startVolume = 0,
	targetVolume = 85,
	fadeDurationMs = 5000,
	attempt = 0,
): Promise<void> {
	const reqOptions = instance.getRequestOptionsBase()
	if (!reqOptions) return

	try {
		if (fadeIn) {
			await ChangeVolume(instance, deviceId, true, Number(startVolume))
			await GetCurrentVolume(instance, deviceId)
		}

		await play(reqOptions, {
			deviceId: deviceId,
			uris: uris,
			position_ms: positionMs,
		})

		if (fadeIn) {
			await FadeVolume(instance, deviceId, Number(targetVolume), Number(fadeDurationMs))
		}
	} catch (err) {
		const retry = await instance.checkIfApiErrorShouldRetry(err)
		if (retry && attempt <= MAX_ATTEMPTS) {
			return PlaySpecificTracks(
				instance,
				deviceId,
				uris,
				positionMs,
				fadeIn,
				startVolume,
				targetVolume,
				fadeDurationMs,
				attempt + 1,
			)
		} else {
			throw err
		}
	}
}

const FADE_MIN_INTERVAL_MS = 500

export async function FadeVolume(
	instance: SpotifyInstanceBase,
	deviceId: string,
	targetVolume: number,
	fadeDurationMs: number,
): Promise<void> {
	const reqOptions = instance.getRequestOptionsBase()
	if (!reqOptions) return

	const clampedTarget = Math.max(0, Math.min(100, Math.round(targetVolume)))
	const clampedDuration = Math.max(FADE_MIN_INTERVAL_MS, fadeDurationMs)

	const numSteps = Math.max(1, Math.floor(clampedDuration / FADE_MIN_INTERVAL_MS))
	const intervalMs = clampedDuration / numSteps

	const startVolume = await GetCurrentVolume(instance, deviceId)
	if (startVolume === clampedTarget) return

	const signal = instance.startVolumeFade()
	let step = 0

	await new Promise<void>((resolve) => {
		const timer = setIntervalAsync(async () => {
			if (signal.aborted) {
				await clearIntervalAsync(timer)
				resolve()
				return
			}

			step++
			const isLast = step >= numSteps
			const nextVolume = isLast
				? clampedTarget
				: Math.max(0, Math.min(100, Math.round(startVolume + ((clampedTarget - startVolume) * step) / numSteps)))

			try {
				await setVolume(reqOptions, nextVolume, { deviceId })
				instance.setVariableValues({ volume: nextVolume })
			} catch (err) {
				instance.log('warn', `FadeVolume step ${step} failed: ${err}`)
			}

			if (isLast || signal.aborted) {
				await clearIntervalAsync(timer)
				resolve()
			}
		}, intervalMs)
	})
}
