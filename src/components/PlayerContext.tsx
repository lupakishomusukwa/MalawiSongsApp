

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
  duration?: number;
  audioUrl?: string | null;
};

type RepeatMode = "off" | "all" | "one";

type PlayerContextType = {
  currentSong: PlayerSong | null;
  buttonShowsPause: boolean;
  progress: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
  playerVisible: boolean;
  selectSong: (song: PlayerSong) => void;
  togglePlayButton: () => void;
  setProgress: (value: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  openPlayer: () => void;
  closePlayer: () => void;
  showQueueNotice: () => void;
};

const PlayerContext = createContext<PlayerContextType | undefined>(
  undefined
);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentSong, setCurrentSong] = useState<PlayerSong | null>(null);
  const [buttonShowsPause, setButtonShowsPause] = useState(false);
  const [progress, setProgress] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [playerVisible, setPlayerVisible] = useState(false);

  function selectSong(song: PlayerSong) {
    setCurrentSong(song);
    setButtonShowsPause(false);
    setProgress(0);
  }

  function togglePlayButton() {
    // UI demonstration only. This does not play audio.
    setButtonShowsPause((previous) => !previous);
  }

  function toggleShuffle() {
    setShuffle((previous) => !previous);
  }

  function cycleRepeat() {
    setRepeatMode((previous) => {
      if (previous === "off") return "all";
      if (previous === "all") return "one";
      return "off";
    });
  }

  function showQueueNotice() {
    // Queue navigation will be connected when audio playback is added.
    setButtonShowsPause(false);
  }

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        buttonShowsPause,
        progress,
        shuffle,
        repeatMode,
        playerVisible,
        selectSong,
        togglePlayButton,
        setProgress,
        toggleShuffle,
        cycleRepeat,
        openPlayer: () => setPlayerVisible(true),
        closePlayer: () => setPlayerVisible(false),
        showQueueNotice,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);

  if (!context) {
    throw new Error("usePlayer must be used inside PlayerProvider");
  }

  return context;
}
