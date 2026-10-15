
import React, {
    createContext,
    ReactNode,
    useContext,
    useState,
} from "react";

export type PlayerSong = {
  id: string;
  title: string;
  artist: string;
  artwork?: string | null;
  audioUrl?: string | null;
};

const demoQueue: PlayerSong[] = [
  {
    id: "demo-1",
    title: "Select a song to begin",
    artist: "MalawiSongs",
    artwork: null,
    audioUrl: null,
  },
  {
    id: "demo-2",
    title: "Music player preview",
    artist: "MalawiSongs",
    artwork: null,
    audioUrl: null,
  },
];

type RepeatMode = "off" | "all" | "one";

type PlayerContextValue = {
  currentSong: PlayerSong;
  queue: PlayerSong[];
  isPlaying: boolean;
  progress: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  selectSong: (song: PlayerSong, songs?: PlayerSong[]) => void;
  togglePlay: () => void;
  nextSong: () => void;
  previousSong: () => void;
  seekTo: (seconds: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
};

const PlayerContext = createContext<PlayerContextValue | undefined>(
  undefined
);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<PlayerSong[]>(demoQueue);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");

  const currentSong = queue[currentIndex] ?? demoQueue[0];

  // Placeholder duration for the interface only.
  const duration = 210;

  function selectSong(song: PlayerSong, songs?: PlayerSong[]) {
    const newQueue = songs?.length ? songs : [song];
    const foundIndex = newQueue.findIndex((item) => item.id === song.id);

    setQueue(newQueue);
    setCurrentIndex(foundIndex >= 0 ? foundIndex : 0);
    setProgress(0);

    // Deliberately do not start audio until an official audio URL
    // and a playback engine are connected.
    setIsPlaying(false);
  }

  function togglePlay() {
    setIsPlaying((previous) => !previous);
  }

  function nextSong() {
    if (queue.length < 2) return;

    const nextIndex = isShuffle
      ? Math.floor(Math.random() * queue.length)
      : (currentIndex + 1) % queue.length;

    setCurrentIndex(nextIndex);
    setProgress(0);
    setIsPlaying(false);
  }

  function previousSong() {
    if (queue.length < 2) return;

    const previousIndex =
      currentIndex === 0 ? queue.length - 1 : currentIndex - 1;

    setCurrentIndex(previousIndex);
    setProgress(0);
    setIsPlaying(false);
  }

  function seekTo(seconds: number) {
    setProgress(Math.max(0, Math.min(seconds, duration)));
  }

  function toggleShuffle() {
    setIsShuffle((previous) => !previous);
  }

  function cycleRepeat() {
    setRepeatMode((previous) => {
      if (previous === "off") return "all";
      if (previous === "all") return "one";
      return "off";
    });
  }

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        queue,
        isPlaying,
        progress,
        duration,
        isShuffle,
        repeatMode,
        selectSong,
        togglePlay,
        nextSong,
        previousSong,
        seekTo,
        toggleShuffle,
        cycleRepeat,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(PlayerContext);

  if (!context) {
    throw new Error(
      "useMusicPlayer must be used inside PlayerProvider"
    );
  }

  return context;
}
