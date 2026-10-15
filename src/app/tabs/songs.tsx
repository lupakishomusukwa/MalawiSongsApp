import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSharedAudio } from "../../context/AudioPlayerContext";

const API_URL = "https://api.malawisongs.com/api/lupakisho/songs";
const FAVORITES_KEY = "malawisongs_favorites";
const FILTERS = ["All Songs", "Latest Songs", "Popular Songs"];

type Song = {
  song_id: string;
  title: string;
  artist_id: string;
  artist_name: string;
  album_id: string | null;
  image: string | null;
  audio_src: string | null;
  audio_locked: boolean;
  has_price: boolean;
  price: number | null;
  created_at: string;
  plays_count: number;
  recent_plays: number;
  audio_url?: string | null;
  audioUrl?: string | null;
};

type SongsResponse = {
  status: string;
  data: Song[];
  pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    has_more: boolean;
  };
};

export default function Songs() {
  const router = useRouter();
  const routeParams =
    useLocalSearchParams<{ category?: string | string[] }>();

  const rawCategory = routeParams.category;
  const selectedCategory = Array.isArray(rawCategory)
    ? rawCategory[0] || ""
    : rawCategory || "";

  const {
    player,
    playerStatus,
    activeSongId,
    playSong,
    stopPlayer,
  } = useSharedAudio();

  const [songs, setSongs] = useState<Song[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All Songs");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalSongs, setTotalSongs] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "one" | "all">("off");

  const handledFinishRef = useRef(false);

  const searchTerm = searchText.trim() || selectedCategory.trim();
  const currentTime = playerStatus.currentTime ?? 0;
  const duration = playerStatus.duration ?? 0;
  const isPlaying = !!playerStatus.playing;

  const progressPercent =
    duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  const formatTime = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    return `${Math.floor(safeSeconds / 60)}:${String(
      safeSeconds % 60
    ).padStart(2, "0")}`;
  };

  const playableSongs = songs.filter(
    (song) => !song.audio_locked && !song.has_price && !!song.audio_src
  );

  const getSortValue = useCallback(() => {
    if (selectedFilter === "Latest Songs") return "new";
    if (selectedFilter === "Popular Songs") return "trending";
    return "";
  }, [selectedFilter]);

  // Load saved favorites.
  useEffect(() => {
    let isActive = true;

    async function loadFavorites() {
      try {
        const saved = await AsyncStorage.getItem(FAVORITES_KEY);
        if (isActive && saved) {
          const ids: unknown = JSON.parse(saved);
          if (Array.isArray(ids) && ids.every((id) => typeof id === "string")) {
            setFavoriteIds(new Set(ids));
          }
        }
      } catch {
        if (isActive) {
          Alert.alert("Favorites", "Saved favorites could not be loaded.");
        }
      } finally {
        if (isActive) setFavoritesLoaded(true);
      }
    }

    void loadFavorites();
    return () => {
      isActive = false;
    };
  }, []);

  // Save favorites whenever they change.
  useEffect(() => {
    if (!favoritesLoaded) return;
    AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favoriteIds))).catch(
      () => Alert.alert("Favorites", "Your favorite changes could not be saved.")
    );
  }, [favoriteIds, favoritesLoaded]);

  // Fetch songs from the API.
  useEffect(() => {
    let isActive = true;

    async function fetchSongs() {
      setLoading(true);
      setError("");
      setPage(1);
      setLastPage(1);
      setTotalSongs(0);
      setSongs([]);

      try {
        const query = new URLSearchParams();
        query.set("page", "1");
        query.set("limit", "25");
        if (searchTerm) query.set("search", searchTerm);

        const sortValue = getSortValue();
        if (sortValue) query.set("sort", sortValue);

        const response = await fetch(`${API_URL}?${query.toString()}`);
        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}`);
        }

        const result: SongsResponse = await response.json();
        if (result.status !== "ok" || !Array.isArray(result.data)) {
          throw new Error("The songs API returned an unexpected response.");
        }

        if (!isActive) return;
        setSongs(result.data);
        setPage(result.pagination?.current_page ?? 1);
        setLastPage(result.pagination?.last_page ?? 1);
        setTotalSongs(result.pagination?.total ?? result.data.length);
      } catch (err) {
        if (!isActive) return;
        setError(
          err instanceof Error ? err.message : "Unable to load songs. Please try again."
        );
      } finally {
        if (isActive) setLoading(false);
      }
    }

    void fetchSongs();
    return () => {
      isActive = false;
    };
  }, [searchTerm, getSortValue]);

  const loadMoreSongs = useCallback(async () => {
    if (loading || loadingMore || page >= lastPage) return;

    setLoadingMore(true);
    setError("");

    try {
      const nextPage = page + 1;
      const query = new URLSearchParams();
      query.set("page", String(nextPage));
      query.set("limit", "25");
      if (searchTerm) query.set("search", searchTerm);

      const sortValue = getSortValue();
      if (sortValue) query.set("sort", sortValue);

      const response = await fetch(`${API_URL}?${query.toString()}`);
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const result: SongsResponse = await response.json();
      if (result.status !== "ok" || !Array.isArray(result.data)) {
        throw new Error("Unable to load more songs.");
      }

      setSongs((previousSongs) => {
        const existingIds = new Set(previousSongs.map((song) => song.song_id));
        return [
          ...previousSongs,
          ...result.data.filter((song) => !existingIds.has(song.song_id)),
        ];
      });
      setPage(result.pagination?.current_page ?? nextPage);
      setLastPage(result.pagination?.last_page ?? lastPage);
      setTotalSongs(result.pagination?.total ?? totalSongs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load more songs.");
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, page, lastPage, searchTerm, getSortValue, totalSongs]);

  // All songs use the one shared app-wide player.
  const handlePlay = (song: Song) => {
    if (song.audio_locked || song.has_price || !song.audio_src) {
      Alert.alert(
        "Playback unavailable",
        song.has_price || song.audio_locked
          ? "This song requires authorization or purchase."
          : "No audio source is available for this song."
      );
      return;
    }

    handledFinishRef.current = false;
    playSong(song.song_id, song.audio_src);
  };

  const handleNextTrack = () => {
    if (playableSongs.length === 0) {
      Alert.alert("No playable songs", "There are no playable songs in the current list.");
      return;
    }

    const currentIndex = playableSongs.findIndex(
      (song) => song.song_id === activeSongId
    );
    let nextSong: Song | undefined;

    if (shuffleEnabled && playableSongs.length > 1) {
      const others = playableSongs.filter((song) => song.song_id !== activeSongId);
      nextSong = others[Math.floor(Math.random() * others.length)];
    } else if (currentIndex === -1) {
      nextSong = playableSongs[0];
    } else if (currentIndex < playableSongs.length - 1) {
      nextSong = playableSongs[currentIndex + 1];
    } else if (repeatMode === "all") {
      nextSong = playableSongs[0];
    }

    if (nextSong) {
      handlePlay(nextSong);
    } else {
      stopPlayer();
      handledFinishRef.current = false;
    }
  };

  const handlePreviousTrack = () => {
    if (playableSongs.length === 0) {
      Alert.alert("No playable songs", "There are no playable songs in the current list.");
      return;
    }

    if (activeSongId && currentTime > 3) {
      player.seekTo(0);
      return;
    }

    const currentIndex = playableSongs.findIndex(
      (song) => song.song_id === activeSongId
    );

    if (currentIndex === -1) {
      handlePlay(playableSongs[0]);
    } else if (currentIndex === 0) {
      if (repeatMode === "all") {
        handlePlay(playableSongs[playableSongs.length - 1]);
      } else {
        player.seekTo(0);
      }
    } else {
      handlePlay(playableSongs[currentIndex - 1]);
    }
  };

  const handleDownload = async (song: Song) => {
    const audioUrl = song.audio_url || song.audioUrl || song.audio_src;

    if (song.audio_locked || song.has_price || !audioUrl) {
      Alert.alert(
        "Download unavailable",
        "An authorized audio URL is not available for this song."
      );
      return;
    }

    if (!audioUrl.startsWith("https://") && !audioUrl.startsWith("http://")) {
      Alert.alert("Download failed", "The audio URL is invalid.");
      return;
    }

    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!FileSystem.cacheDirectory) {
        throw new Error("The temporary download directory is unavailable.");
      }

      const safeTitle = (song.title || "MalawiSong")
        .replace(/[<>:"/\\|?*]/g, "_")
        .slice(0, 100);
      const fileUri = FileSystem.cacheDirectory + safeTitle + ".mp3";
      const result = await FileSystem.downloadAsync(audioUrl, fileUri);

      if (result.status < 200 || result.status >= 300) {
        throw new Error(`Download failed with HTTP ${result.status}.`);
      }

      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType: "audio/mpeg",
          dialogTitle: `Save or share ${song.title}`,
          UTI: "public.mp3",
        });
      } else {
        Alert.alert(
          "Download complete",
          "The file was downloaded to temporary app storage."
        );
      }
    } catch (err) {
      Alert.alert(
        "Download failed",
        err instanceof Error ? err.message : "Please try again."
      );
    }
  };

  const handleStop = () => {
    stopPlayer();
    handledFinishRef.current = false;
  };

  // Automatically move to the next track when the shared player finishes.
  useEffect(() => {
    if (!playerStatus.didJustFinish) {
      handledFinishRef.current = false;
      return;
    }
    if (handledFinishRef.current || !activeSongId) return;
    handledFinishRef.current = true;

    if (repeatMode === "one") {
      player.seekTo(0);
      player.play();
      return;
    }

    const currentIndex = playableSongs.findIndex(
      (song) => song.song_id === activeSongId
    );

    if (currentIndex === -1 || playableSongs.length === 0) return;

    let nextSong: Song | undefined;
    if (shuffleEnabled && playableSongs.length > 1) {
      const others = playableSongs.filter((song) => song.song_id !== activeSongId);
      nextSong = others[Math.floor(Math.random() * others.length)];
    } else if (currentIndex < playableSongs.length - 1) {
      nextSong = playableSongs[currentIndex + 1];
    } else if (repeatMode === "all") {
      nextSong = playableSongs[0];
    }

    if (nextSong?.audio_src) {
      playSong(nextSong.song_id, nextSong.audio_src);
    } else {
      stopPlayer();
    }
  }, [
    playerStatus.didJustFinish,
    activeSongId,
    repeatMode,
    shuffleEnabled,
    songs,
    player,
    playSong,
    stopPlayer,
  ]);

  const toggleFavorite = (song: Song) => {
    if (!favoritesLoaded) return;
    setFavoriteIds((previous) => {
      const updated = new Set(previous);
      if (updated.has(song.song_id)) updated.delete(song.song_id);
      else updated.add(song.song_id);
      return updated;
    });
  };

  const handleShare = async (song: Song) => {
    try {
      await Share.share({
        title: song.title,
        message: `Listen to ${song.title} by ${
          song.artist_name || "Unknown Artist"
        } on MalawiSongs.\n\nhttps://malawisongs.com`,
      });
    } catch {
      Alert.alert("Share failed", "Unable to share this song. Please try again.");
    }
  };

  const clearSearch = () => setSearchText("");
  const screenTitle = selectedCategory ? `${selectedCategory} Songs` : "Songs";
  const currentSong = songs.find((song) => song.song_id === activeSongId);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{screenTitle}</Text>
            <Text style={styles.subtitle}>Discover music from Malawi</Text>
          </View>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={21} color="#999999" />
          <TextInput
            style={styles.searchInput}
            placeholder={
              selectedCategory
                ? `Search ${selectedCategory} songs...`
                : "Search songs or artists..."
            }
            placeholderTextColor="#888888"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {searchText.length > 0 && (
            <Pressable onPress={clearSearch} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={21} color="#999999" />
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((filter) => {
            const selected = selectedFilter === filter;
            return (
              <Pressable
                key={filter}
                onPress={() => setSelectedFilter(filter)}
                style={[styles.filterButton, selected && styles.activeFilter]}
              >
                <Text style={[styles.filterText, selected && styles.activeFilterText]}>{filter}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {currentSong && (
          <View style={styles.playerSection}>
            <View style={styles.playerCard}>
              <View style={styles.playerSongInfo}>
                <Text style={styles.playerLabel}>NOW PLAYING</Text>
                <Text style={styles.playerSongTitle} numberOfLines={1}>{currentSong.title}</Text>
                <Text style={styles.playerArtist} numberOfLines={1}>{currentSong.artist_name}</Text>
              </View>
              <Pressable
                style={styles.playerControl}
                onPress={() => handlePlay(currentSong)}
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? "Pause song" : "Resume song"}
              >
                <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#101010" />
              </Pressable>
              <Pressable style={styles.stopControl} onPress={handleStop} accessibilityRole="button" accessibilityLabel="Stop song">
                <Ionicons name="stop" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.progressContainer}>
              <Pressable
                style={styles.progressTrack}
                onLayout={(event) => setProgressTrackWidth(event.nativeEvent.layout.width)}
                onPress={(event) => {
                  if (duration <= 0 || progressTrackWidth <= 0) return;
                  const position = Math.max(0, Math.min(event.nativeEvent.locationX / progressTrackWidth, 1));
                  player.seekTo(position * duration);
                }}
                accessibilityRole="adjustable"
                accessibilityLabel="Song playback progress"
              >
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </Pressable>
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
            </View>

            <View style={styles.trackNavigation}>
              <Pressable style={styles.trackButton} onPress={handlePreviousTrack} accessibilityRole="button" accessibilityLabel="Play previous song">
                <Ionicons name="play-skip-back" size={23} color="#FFFFFF" />
                <Text style={styles.trackButtonText}>Previous</Text>
              </Pressable>
              <Pressable style={styles.trackButton} onPress={handleNextTrack} accessibilityRole="button" accessibilityLabel="Play next song">
                <Text style={styles.trackButtonText}>Next</Text>
                <Ionicons name="play-skip-forward" size={23} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.playbackOptions}>
              <Pressable
                style={[styles.optionButton, shuffleEnabled && styles.activeOptionButton]}
                onPress={() => setShuffleEnabled((enabled) => !enabled)}
                accessibilityRole="button"
                accessibilityLabel={shuffleEnabled ? "Disable shuffle" : "Enable shuffle"}
              >
                <Ionicons name="shuffle" size={21} color={shuffleEnabled ? "#19C37D" : "#AAAAAA"} />
                <Text style={[styles.optionText, shuffleEnabled && styles.activeOptionText]}>Shuffle</Text>
              </Pressable>
              <Pressable
                style={[styles.optionButton, repeatMode !== "off" && styles.activeOptionButton]}
                onPress={() => setRepeatMode((mode) => mode === "off" ? "all" : mode === "all" ? "one" : "off")}
                accessibilityRole="button"
                accessibilityLabel={`Repeat mode: ${repeatMode}`}
              >
                <Ionicons
                  name={repeatMode === "off" ? "repeat-outline" : "repeat"}
                  size={21}
                  color={repeatMode !== "off" ? "#19C37D" : "#AAAAAA"}
                />
                <Text style={[styles.optionText, repeatMode !== "off" && styles.activeOptionText]}>
                  {repeatMode === "off" ? "Repeat Off" : repeatMode === "one" ? "Repeat One" : "Repeat All"}
                </Text>
                {repeatMode === "one" && <Text style={styles.repeatOneBadge}>1</Text>}
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.resultsHeader}>
          <Text style={styles.sectionTitle}>{searchTerm ? "Search Results" : "All Music"}</Text>
          {!loading && <Text style={styles.songCount}>{totalSongs} songs</Text>}
        </View>

        {loading && (
          <View style={styles.centerMessage}>
            <ActivityIndicator size="large" color="#19C37D" />
            <Text style={styles.messageText}>Loading songs...</Text>
          </View>
        )}

        {!loading && error.length > 0 && songs.length === 0 && (
          <View style={styles.centerMessage}>
            <Ionicons name="cloud-offline-outline" size={42} color="#FF7777" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => setSelectedFilter((current) => current === "All Songs" ? "Latest Songs" : "All Songs")}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {!loading && !error && songs.length === 0 && (
          <View style={styles.centerMessage}>
            <Ionicons name="musical-notes-outline" size={44} color="#777777" />
            <Text style={styles.emptyTitle}>No songs found</Text>
            <Text style={styles.messageText}>Try another search or choose a different filter.</Text>
          </View>
        )}

        {!loading && songs.map((song, index) => {
          const isFavorite = favoriteIds.has(song.song_id);
          const isCurrentSong = activeSongId === song.song_id;
          const canPlay = !song.audio_locked && !song.has_price && !!song.audio_src;

          return (
            <View key={`${song.song_id}-${index}`} style={styles.songCard}>
              {song.image ? (
                <Image source={{ uri: song.image }} style={styles.cover} />
              ) : (
                <View style={styles.placeholderCover}>
                  <Ionicons name="musical-notes" size={28} color="#19C37D" />
                </View>
              )}

              <View style={styles.songInfo}>
                <Text style={styles.songTitle} numberOfLines={2}>{song.title || "Untitled Song"}</Text>
                <Text style={styles.artistName} numberOfLines={1}>{song.artist_name || "Unknown Artist"}</Text>
                <Text style={styles.plays}>{Number(song.plays_count || 0).toLocaleString()} plays</Text>
                {!canPlay && (
                  <Text style={styles.lockedText}>
                    {song.has_price || song.audio_locked ? "Purchase required" : "Audio unavailable"}
                  </Text>
                )}
              </View>

              <View style={styles.songActions}>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => toggleFavorite(song)}
                  disabled={!favoritesLoaded}
                  accessibilityRole="button"
                  accessibilityLabel={isFavorite ? `Remove ${song.title} from favorites` : `Add ${song.title} to favorites`}
                  hitSlop={6}
                >
                  <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={21} color={isFavorite ? "#FF4D6D" : "#FFFFFF"} />
                </Pressable>
                <Pressable style={styles.actionButton} onPress={() => void handleShare(song)} accessibilityRole="button" accessibilityLabel={`Share ${song.title}`} hitSlop={6}>
                  <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
                </Pressable>
                <Pressable style={styles.downloadButton} onPress={() => void handleDownload(song)} accessibilityRole="button" accessibilityLabel={`Download ${song.title}`} hitSlop={6}>
                  <Ionicons name="download-outline" size={21} color="#19C37D" />
                </Pressable>
                <Pressable
                  style={[styles.playButton, !canPlay && styles.disabledPlayButton]}
                  onPress={() => handlePlay(song)}
                  accessibilityRole="button"
                  accessibilityLabel={isCurrentSong && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
                  hitSlop={6}
                >
                  <Ionicons name={isCurrentSong && isPlaying ? "pause" : "play"} size={22} color="#101010" />
                </Pressable>
              </View>
            </View>
          );
        })}

        {!loading && songs.length > 0 && page < lastPage && (
          <Pressable style={styles.loadMoreButton} onPress={() => void loadMoreSongs()} disabled={loadingMore}>
            {loadingMore ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.loadMoreText}>Load More Songs</Text>}
          </Pressable>
        )}

        {!loading && songs.length > 0 && page >= lastPage && (
          <Text style={styles.endText}>You have reached the end of the list.</Text>
        )}
        {error.length > 0 && songs.length > 0 && <Text style={styles.inlineError}>{error}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#101010" },
  scrollContent: { paddingHorizontal: 18, paddingTop: 55, paddingBottom: 35 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "800" },
  subtitle: { color: "#A5A5A5", fontSize: 14, marginTop: 6 },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#252525", alignItems: "center", justifyContent: "center" },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#202020", borderRadius: 14, paddingHorizontal: 14, height: 52, gap: 10, marginBottom: 20 },
  searchInput: { flex: 1, color: "#FFFFFF", fontSize: 14, height: "100%" },
  filters: { gap: 10, paddingBottom: 8 },
  filterButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, backgroundColor: "#252525" },
  activeFilter: { backgroundColor: "#19C37D" },
  filterText: { color: "#CCCCCC", fontSize: 13, fontWeight: "600" },
  activeFilterText: { color: "#101010" },
  playerSection: { marginTop: 15, backgroundColor: "#202820", borderColor: "#19C37D", borderWidth: 1, borderRadius: 14, padding: 13 },
  playerCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  playerSongInfo: { flex: 1, minWidth: 0 },
  playerLabel: { color: "#19C37D", fontSize: 10, fontWeight: "800", letterSpacing: 1, marginBottom: 4 },
  playerSongTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  playerArtist: { color: "#AAAAAA", fontSize: 12, marginTop: 3 },
  playerControl: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#19C37D", alignItems: "center", justifyContent: "center" },
  stopControl: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#333333", alignItems: "center", justifyContent: "center" },
  progressContainer: { marginTop: 16, marginBottom: 4 },
  progressTrack: { height: 6, width: "100%", borderRadius: 6, backgroundColor: "#404040", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#19C37D", borderRadius: 6 },
  timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 7 },
  timeText: { color: "#AAAAAA", fontSize: 11, fontVariant: ["tabular-nums"] },
  trackNavigation: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, marginBottom: 6 },
  trackButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: "#292929" },
  trackButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  playbackOptions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, marginBottom: 2 },
  optionButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: "#202020" },
  activeOptionButton: { backgroundColor: "#20372D" },
  optionText: { color: "#AAAAAA", fontSize: 12, fontWeight: "600" },
  activeOptionText: { color: "#19C37D" },
  repeatOneBadge: { color: "#19C37D", fontSize: 10, fontWeight: "800", marginLeft: -5 },
  resultsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 22, marginBottom: 15 },
  sectionTitle: { color: "#FFFFFF", fontSize: 19, fontWeight: "700" },
  songCount: { color: "#999999", fontSize: 12 },
  centerMessage: { alignItems: "center", justifyContent: "center", paddingVertical: 45, gap: 12 },
  messageText: { color: "#AAAAAA", fontSize: 14, textAlign: "center" },
  errorText: { color: "#FF7777", fontSize: 14, textAlign: "center" },
  emptyTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  retryButton: { backgroundColor: "#19C37D", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 11, marginTop: 5 },
  retryText: { color: "#101010", fontWeight: "700" },
  songCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#1C1C1C", padding: 11, borderRadius: 14, marginBottom: 12, gap: 10 },
  cover: { width: 62, height: 62, borderRadius: 10, backgroundColor: "#303030" },
  placeholderCover: { width: 62, height: 62, borderRadius: 10, backgroundColor: "#303030", alignItems: "center", justifyContent: "center" },
  songInfo: { flex: 1, justifyContent: "center", minWidth: 0 },
  songTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", lineHeight: 20 },
  artistName: { color: "#AAAAAA", fontSize: 12, marginTop: 4 },
  plays: { color: "#777777", fontSize: 11, marginTop: 5 },
  lockedText: { color: "#F0B35A", fontSize: 10, marginTop: 4 },
  songActions: { flexDirection: "row", alignItems: "center", gap: 3 },
  actionButton: { width: 28, height: 38, alignItems: "center", justifyContent: "center" },
  downloadButton: { width: 30, height: 38, borderRadius: 15, backgroundColor: "#292929", alignItems: "center", justifyContent: "center" },
  playButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#19C37D", alignItems: "center", justifyContent: "center" },
  disabledPlayButton: { backgroundColor: "#777777" },
  loadMoreButton: { backgroundColor: "#292929", paddingVertical: 15, borderRadius: 12, alignItems: "center", marginTop: 8 },
  loadMoreText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  endText: { color: "#777777", fontSize: 12, textAlign: "center", paddingVertical: 22 },
  inlineError: { color: "#FF7777", textAlign: "center", marginTop: 12 },
});
