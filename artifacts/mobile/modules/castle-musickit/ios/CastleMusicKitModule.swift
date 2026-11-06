import ExpoModulesCore
import MusicKit

/// Plays Apple Music catalog songs for arena music.
///
/// Nothing in here runs at module load. MusicKit is touched only when JavaScript
/// calls a function, so a declined permission cannot take down startup.
/// Android does not compile this file.
@MainActor
final class CatalogPlayer {
  static let shared = CatalogPlayer()

  private var generation = 0
  private var watchTask: Task<Void, Never>?
  private var userPaused = false
  private var shouldKeepPlaying = false

  func authorizationStatus() -> String {
    statusString(MusicAuthorization.currentStatus)
  }

  func requestAuthorization() async -> String {
    let status = await MusicAuthorization.request()
    return statusString(status)
  }

  func canPlayCatalogContent() async -> Bool {
    guard MusicAuthorization.currentStatus == .authorized else { return false }
    do {
      let subscription = try await MusicSubscription.current
      return subscription.canPlayCatalogContent
    } catch {
      return false
    }
  }

  /// `loopOne` repeats the first resolved song. Otherwise the queue repeats as a group.
  func play(songIds: [String], loopOne: Bool) async -> Bool {
    generation += 1
    let token = generation
    userPaused = false
    shouldKeepPlaying = false
    watchTask?.cancel()
    watchTask = nil

    do {
      guard MusicAuthorization.currentStatus == .authorized else { return false }
      let subscription = try await MusicSubscription.current
      guard subscription.canPlayCatalogContent else { return false }
      guard token == generation else { return false }

      let ids = songIds.map { MusicItemID(rawValue: $0) }
      var request = MusicCatalogResourceRequest<Song>(matching: \.id, memberOf: ids)
      let response = try await request.response()
      let byId = Dictionary(response.items.map { ($0.id.rawValue, $0) }, uniquingKeysWith: { existing, _ in existing })
      let ordered = songIds.compactMap { byId[$0] }
      guard !ordered.isEmpty else { return false }
      guard token == generation else { return false }

      let player = ApplicationMusicPlayer.shared
      let repeatOne = loopOne || ordered.count == 1
      player.state.repeatMode = repeatOne ? MusicPlayer.RepeatMode.one : MusicPlayer.RepeatMode.all
      player.queue = ApplicationMusicPlayer.Queue(for: ordered)
      try await player.play()
      guard token == generation else {
        silence()
        return false
      }
      shouldKeepPlaying = true
      startWatch(token: token)
      return true
    } catch {
      return false
    }
  }

  func pause() {
    userPaused = true
    ApplicationMusicPlayer.shared.pause()
  }

  func resume() async -> Bool {
    guard shouldKeepPlaying else { return false }
    userPaused = false
    do {
      try await ApplicationMusicPlayer.shared.play()
      return true
    } catch {
      return false
    }
  }

  /// Next queue entry. A one-song loop restarts that song when skip has nowhere to go.
  func skip() async -> Bool {
    guard shouldKeepPlaying || userPaused else { return false }
    userPaused = false
    let player = ApplicationMusicPlayer.shared
    do {
      try await player.skipToNextEntry()
      return true
    } catch {
      player.playbackTime = 0
      do {
        try await player.play()
        return true
      } catch {
        return false
      }
    }
  }

  func stop() {
    generation += 1
    shouldKeepPlaying = false
    userPaused = false
    watchTask?.cancel()
    watchTask = nil
    silence()
  }

  /// ApplicationMusicPlayer has no per-app gain. Callers pause for silence.
  func setVolume(_ volume: Double) -> Bool {
    _ = volume
    return false
  }

  private func silence() {
    let player = ApplicationMusicPlayer.shared
    player.pause()
    // Clearing a queue that was never set is a no-op. Ignore a player that refuses it.
    player.queue.entries = []
    player.state.repeatMode = MusicPlayer.RepeatMode.none
  }

  /// Restarts playback if repeat mode lets the queue stop. A user pause does not restart.
  private func startWatch(token: Int) {
    watchTask?.cancel()
    watchTask = Task { @MainActor in
      var sawPlayback = false
      var failedRestarts = 0
      while !Task.isCancelled && token == self.generation && self.shouldKeepPlaying {
        try? await Task.sleep(nanoseconds: 1_000_000_000)
        if token != self.generation || !self.shouldKeepPlaying { return }
        let status = ApplicationMusicPlayer.shared.state.playbackStatus
        if self.transportInProgress(status) {
          sawPlayback = true
          failedRestarts = 0
          continue
        }
        if self.userPaused { continue }
        // Repeat mode should keep the queue going. This only covers a player
        // that stopped at the end of the item. Three failures in a row give up.
        if sawPlayback && status == .stopped {
          if failedRestarts >= 3 { return }
          failedRestarts += 1
          sawPlayback = false
          try? await ApplicationMusicPlayer.shared.play()
        }
      }
    }
  }

  /// Playing or scrubbing. Pause, stop, and interruption are not in progress.
  ///
  /// `MusicPlayer.PlaybackStatus` (iOS 15+) is `playing`, `paused`, `stopped`,
  /// `interrupted`, `seekingForward`, and `seekingBackward`. It has no `seeking`
  /// member. A scrub stays in progress so this loop does not call `play()` over
  /// it. An unknown future case is left alone instead of being treated as a seek.
  private func transportInProgress(_ status: MusicPlayer.PlaybackStatus) -> Bool {
    switch status {
    case .playing, .seekingForward, .seekingBackward:
      return true
    case .paused, .stopped, .interrupted:
      return false
    @unknown default:
      return false
    }
  }

  private func statusString(_ status: MusicAuthorization.Status) -> String {
    switch status {
    case .authorized:
      return "authorized"
    case .denied:
      return "denied"
    case .restricted:
      return "restricted"
    case .notDetermined:
      return "notDetermined"
    @unknown default:
      return "unavailable"
    }
  }
}

public class CastleMusicKitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CastleMusicKit")

    // No OnCreate work. Reading MusicKit while the app is booting is off limits.

    AsyncFunction("getAuthorizationStatus") { (promise: Promise) in
      Task { @MainActor in
        promise.resolve(CatalogPlayer.shared.authorizationStatus())
      }
    }

    AsyncFunction("requestAuthorization") { (promise: Promise) in
      Task { @MainActor in
        let status = await CatalogPlayer.shared.requestAuthorization()
        promise.resolve(status)
      }
    }

    AsyncFunction("canPlayCatalogContent") { (promise: Promise) in
      Task { @MainActor in
        let allowed = await CatalogPlayer.shared.canPlayCatalogContent()
        promise.resolve(allowed)
      }
    }

    AsyncFunction("playSong") { (songId: String, loop: Bool, promise: Promise) in
      Task { @MainActor in
        let ok = await CatalogPlayer.shared.play(songIds: [songId], loopOne: loop)
        promise.resolve(ok)
      }
    }

    AsyncFunction("playQueue") { (songIds: [String], promise: Promise) in
      Task { @MainActor in
        let ok = await CatalogPlayer.shared.play(songIds: songIds, loopOne: false)
        promise.resolve(ok)
      }
    }

    AsyncFunction("pause") { (promise: Promise) in
      Task { @MainActor in
        CatalogPlayer.shared.pause()
        promise.resolve(true)
      }
    }

    AsyncFunction("resume") { (promise: Promise) in
      Task { @MainActor in
        let ok = await CatalogPlayer.shared.resume()
        promise.resolve(ok)
      }
    }

    AsyncFunction("skip") { (promise: Promise) in
      Task { @MainActor in
        let ok = await CatalogPlayer.shared.skip()
        promise.resolve(ok)
      }
    }

    AsyncFunction("stop") { (promise: Promise) in
      Task { @MainActor in
        CatalogPlayer.shared.stop()
        promise.resolve(true)
      }
    }

    AsyncFunction("setVolume") { (volume: Double, promise: Promise) in
      Task { @MainActor in
        promise.resolve(CatalogPlayer.shared.setVolume(volume))
      }
    }
  }
}
