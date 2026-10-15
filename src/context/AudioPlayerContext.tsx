

import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import {
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";

export type AudioTrack = {
  songId: string;
  audioUrl: string;
  title: string;
  artist: string;
  image?: string | null;
};

type AudioContextType = {
  player: ReturnType<typeof useAudioPlayer>;
  playerStatus: ReturnType<typeof useAudioPlayerStatus>;
  activeSongId: string | null;
  queue: AudioTrack[];
  playSong: (
    songId: string,
    audioUrl: string,
    newQueue?: AudioTrack[]
  ) => void;
  togglePlayback: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seekTo: (seconds: number) => void;
  stopPlayer: () => void;
};

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioPlayerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);

  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const playSong = (
    songId: string,
    audioUrl: string,
    newQueue?: AudioTrack[]
  ) => {
    if (!songId || !audioUrl) return;

    const updatedQueue = newQueue ?? queue;
    const selectedIndex = updatedQueue.findIndex(
      (track) => track.songId === songId
    );

    if (newQueue) {
      setQueue(newQueue);
    }

    setCurrentIndex(selectedIndex);

    // Tapping the currently selected song toggles playback.
    if (activeSongId === songId) {
      togglePlayback();
      return;
    }

    player.replace({ uri: audioUrl });
    setActiveSongId(songId);
    player.play();
  };

  const togglePlayback = () => {
    if (playerStatus.playing) {
      player.pause();
    } else if (activeSongId) {
      player.play();
    }
  };

  const playTrackAt = (index: number) => {
    if (index < 0 || index >= queue.length) return;

    const track = queue[index];

    if (!track?.audioUrl) return;

    player.replace({ uri: track.audioUrl });
    setCurrentIndex(index);
    setActiveSongId(track.songId);
    player.play();
  };

  const playNext = () => {
    if (currentIndex >= 0 && currentIndex < queue.length - 1) {
      playTrackAt(currentIndex + 1);
    }
  };

  const playPrevious = () => {
    if (currentIndex > 0) {
      playTrackAt(currentIndex - 1);
    } else if (currentIndex === 0) {
      player.seekTo(0);
      player.play();
    }
  };

  const seekTo = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return;

    const duration = playerStatus.duration;

    player.seekTo(
      Number.isFinite(duration) && duration > 0
        ? Math.min(seconds, duration)
        : seconds
    );
  };

  const stopPlayer = () => {
    player.pause();
    player.seekTo(0);
    setActiveSongId(null);
    setCurrentIndex(-1);
    setQueue([]);
  };

  return (
    <AudioContext.Provider
      value={{
        player,
        playerStatus,
        activeSongId,
        queue,
        playSong,
        togglePlayback,
        playNext,
        playPrevious,
        seekTo,
        stopPlayer,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useSharedAudio() {
  const context = useContext(AudioContext);

  if (!context) {
    throw new Error(
      "useSharedAudio must be used inside AudioPlayerProvider."
    );
  }

  return context;
}
