

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { malawiLog } from "../../components/MalawiSongsLog";
import { useSharedAudio } from "../../context/AudioPlayerContext";

const API_URL = "https://api.malawisongs.com/api/lupakisho/songs";
const ALBUM_FAVORITES_KEY = "malawisongs_favorite_albums";
const DOWNLOADS_FOLDER = "MalawiSongsDownloads";

type Song = {
  song_id?: string | number;
  id?: string | number;
  title?: string;
  artist_name?: string;
  artist?: string;
  album_id?: string | number;
  album_title?: string;
  image?: string | null;
  cover?: string | null;
  audio_src?: string | null;
  duration?: string | number;
  streams?: string | number;
};

type SongsResponse = {
  data?: Song[];
  query?: {
    data?: Song[];
  };
};

function getParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getSongId(song: Song) {
  const id = song.song_id ?? song.id;
  return id === undefined || id === null ? "" : String(id);
}

function formatDuration(value?: string | number) {
  if (value === undefined || value === null || value === "") {
    return "--:--";
  }

  if (typeof value === "string" && value.includes(":")) {
    return value;
  }

  const seconds = Number(value);

  if (!Number.isFinite(seconds) || seconds < 0) {
    return "--:--";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function safeFilename(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 90) || "MalawiSongs";
}

export default function AlbumDetailsScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    album_id?: string | string[];
    title?: string | string[];
    year?: string | string[];
    image?: string | string[];
  }>();

  const albumId = getParam(params.id) || getParam(params.album_id) || "";
  const albumTitle = getParam(params.title) || "Album Details";
  const albumYear = getParam(params.year) || "";
  const albumImage = getParam(params.image) || "";

  const { playerStatus, activeSongId, playSong, stopPlayer } = useSharedAudio();

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [playbackError, setPlaybackError] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadFavorite() {
      try {
        const saved = await AsyncStorage.getItem(ALBUM_FAVORITES_KEY);
        if (!mounted) return;
        const ids: unknown = saved ? JSON.parse(saved) : [];
        if (Array.isArray(ids)) {
          setIsFavorite(ids.map(String).includes(String(albumId)));
        }
      } catch (err) {
        console.warn("Could not load favorite albums:", err);
      } finally {
        if (mounted) setFavoritesLoaded(true);
      }
    }

    void loadFavorite();
    return () => {
      mounted = false;
    };
  }, [albumId]);

  const toggleFavorite = useCallback(async () => {
    if (!albumId) {
      Alert.alert("Favorite album", "This album has no valid ID.");
      return;
    }

    try {
      const saved = await AsyncStorage.getItem(ALBUM_FAVORITES_KEY);
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      const ids = Array.isArray(parsed) ? parsed.map(String) : [];
      const alreadyFavorite = ids.includes(String(albumId));
      const updated = alreadyFavorite
        ? ids.filter((id) => id !== String(albumId))
        : [...ids, String(albumId)];

      await AsyncStorage.setItem(ALBUM_FAVORITES_KEY, JSON.stringify(updated));
      setIsFavorite(!alreadyFavorite);
      Alert.alert(
        alreadyFavorite ? "Removed from favorites" : "Added to favorites",
        alreadyFavorite
          ? `${albumTitle} was removed from your favorite albums.`
          : `${albumTitle} was saved to your favorite albums.`
      );
    } catch (err) {
      console.error("Album favorite error:", err);
      Alert.alert("Favorites", "Could not save this album. Please try again.");
    }
  }, [albumId, albumTitle]);

  const shareAlbum = useCallback(async () => {
    const message = `${albumTitle}${albumYear ? ` (${albumYear})` : ""}\nListen on MalawiSongs: https://malawisongs.com`;
    try {
      await Share.share({
        title: `Share ${albumTitle}`,
        message,
      });
    } catch (err) {
      console.error("Album share error:", err);
      Alert.alert("Share album", "Unable to open the sharing menu.");
    }
  }, [albumTitle, albumYear]);

  const loadSongs = useCallback(async () => {
    if (!albumId) {
      setSongs([]);
      setError("The album ID is missing. Go back and open the album again.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError("");

      const url =
        `${API_URL}?album_id=${encodeURIComponent(albumId)}` +
        "&page=1&limit=50";

      malawiLog(`Loading album songs: ${albumId}`, "INFO");

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}.`);
      }

      const result = (await response.json()) as SongsResponse;

      const receivedSongs = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result.query?.data)
          ? result.query.data
          : [];

      const albumSongs = receivedSongs.filter((song) => {
        if (song.album_id === undefined || song.album_id === null) {
          return false;
        }
        return String(song.album_id) === String(albumId);
      });

      setSongs(albumSongs);
      malawiLog(`Loaded ${albumSongs.length} songs for album ${albumId}`, "INFO");

      if (albumSongs.length === 0) {
        setError("No songs were returned for this album.");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load the album songs.";
      setError(message);
      malawiLog(`Album loading failed: ${message}`, "ERROR");
      console.error("Album loading error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [albumId]);

  useEffect(() => {
    void loadSongs();
  }, [loadSongs]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadSongs();
  };

  const handlePlay = (song: Song) => {
    const songId = getSongId(song);
    const audioUrl = song.audio_src?.trim();

    setPlaybackError("");

    if (!songId) {
      setPlaybackError("This song does not have a valid song ID.");
      return;
    }

    if (!audioUrl) {
      setPlaybackError(
        `No audio source is available for "${song.title || "this song"}".`
      );
      malawiLog(`Missing audio_src for album song: ${song.title || songId}`, "ERROR");
      return;
    }

    try {
      malawiLog(`Playing album song: ${song.title || songId}`, "INFO");
      playSong(songId, audioUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to play this song.";
      setPlaybackError(message);
      malawiLog(`Playback failed: ${message}`, "ERROR");
      console.error("Album playback error:", err);
    }
  };

  const downloadAlbum = useCallback(async () => {
    if (downloading) return;

    const downloadableSongs = songs.filter((song) => {
      const url = song.audio_src?.trim();
      return !!url && /^https?:\/\//i.test(url);
    });

    if (downloadableSongs.length === 0) {
      Alert.alert(
        "Download album",
        "There are no downloadable audio URLs in this album. Some tracks may require an authorized download link."
      );
      return;
    }

    if (!FileSystem.documentDirectory) {
      Alert.alert("Download album", "App storage is not available on this device.");
      return;
    }

    setDownloading(true);
    setDownloadProgress(`Preparing 1 of ${downloadableSongs.length}...`);

    let succeeded = 0;
    let failed = 0;

    try {
      const folderUri = `${FileSystem.documentDirectory}${DOWNLOADS_FOLDER}/`;
      const folderInfo = await FileSystem.getInfoAsync(folderUri);

      if (!folderInfo.exists) {
        await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true });
      }

      for (let index = 0; index < downloadableSongs.length; index += 1) {
        const song = downloadableSongs[index];
        const songId = getSongId(song) || `track-${index + 1}`;
        const title = safeFilename(song.title || `Track_${index + 1}`);
        setDownloadProgress(`Downloading ${index + 1} of ${downloadableSongs.length}`);

        try {
          const audioUrl = song.audio_src!.trim();
          let extension = "mp3";
          try {
            const pathname = new URL(audioUrl).pathname;
            const match = pathname.match(/\.([a-zA-Z0-9]{2,5})$/);
            if (match) extension = match[1].toLowerCase();
          } catch {
            // Keep the default extension when the URL cannot be parsed.
          }

          const destination = `${folderUri}${safeFilename(albumTitle)}_${title}_${safeFilename(songId)}.${extension}`;
          const existing = await FileSystem.getInfoAsync(destination);

          if (existing.exists) {
            succeeded += 1;
            continue;
          }

          const result = await FileSystem.downloadAsync(audioUrl, destination);
          if (result.status >= 200 && result.status < 300) {
            succeeded += 1;
          } else {
            failed += 1;
            await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => {});
          }
        } catch (err) {
          failed += 1;
          console.warn(`Failed to download ${song.title || songId}:`, err);
        }
      }

      setDownloadProgress("");
      Alert.alert(
        "Album download finished",
        `${succeeded} track${succeeded === 1 ? "" : "s"} saved in the app's private storage.${failed ? ` ${failed} could not be downloaded.` : ""}\n\nDownloads are stored inside the app and are not automatically added to your phone's Music folder.`
      );
    } catch (err) {
      console.error("Album download error:", err);
      Alert.alert("Download album", "The album download could not be completed.");
    } finally {
      setDownloading(false);
      setDownloadProgress("");
    }
  }, [albumTitle, downloading, songs]);

  const renderSong = ({ item, index }: { item: Song; index: number }) => {
    const songId = getSongId(item);
    const isActive = activeSongId === songId;
    const cover = item.image || item.cover || albumImage;
    const title = item.title || "Unknown Song";
    const artist = item.artist_name || item.artist || "Unknown Artist";

    return (
      <View style={styles.songRow}>
        <Text style={styles.trackNumber}>{index + 1}</Text>

        {cover ? (
          <Image source={{ uri: cover }} style={styles.songCover} />
        ) : (
          <View style={[styles.songCover, styles.placeholderCover]}>
            <Ionicons name="musical-note" size={23} color="#FFFFFF" />
          </View>
        )}

        <View style={styles.songInfo}>
          <Text numberOfLines={1} style={styles.songTitle}>{title}</Text>
          <Text numberOfLines={1} style={styles.songArtist}>{artist}</Text>
          <Text style={styles.songDuration}>{formatDuration(item.duration)}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${isActive && playerStatus.playing ? "Pause" : "Play"} ${title}`}
          style={styles.playButton}
          onPress={() => handlePlay(item)}
        >
          <Ionicons
            name={isActive && playerStatus.playing ? "pause" : "play"}
            size={22}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={25} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.topBarTitle}>Album</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <FlatList
        data={songs}
        keyExtractor={(item, index) => getSongId(item) || `album-song-${index}`}
        renderItem={renderSong}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.albumHeader}>
              {albumImage ? (
                <Image source={{ uri: albumImage }} style={styles.albumCover} />
              ) : (
                <View style={[styles.albumCover, styles.placeholderCover]}>
                  <Ionicons name="disc-outline" size={65} color="#FFFFFF" />
                </View>
              )}

              <Text style={styles.albumTitle}>{albumTitle}</Text>
              {albumYear ? <Text style={styles.albumYear}>{albumYear}</Text> : null}
              <Text style={styles.trackCount}>
                {songs.length} {songs.length === 1 ? "song" : "songs"}
              </Text>

              <View style={styles.albumActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isFavorite ? "Remove album from favorites" : "Add album to favorites"}
                  style={[styles.actionButton, isFavorite && styles.favoriteButtonActive]}
                  onPress={() => void toggleFavorite()}
                  disabled={!favoritesLoaded}
                >
                  <Ionicons
                    name={isFavorite ? "heart" : "heart-outline"}
                    size={19}
                    color={isFavorite ? "#FF5C7A" : "#FFFFFF"}
                  />
                  <Text style={styles.actionButtonText}>
                    {isFavorite ? "Favorited" : "Favorite"}
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Share album"
                  style={styles.actionButton}
                  onPress={() => void shareAlbum()}
                >
                  <Ionicons name="share-social-outline" size={19} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Share</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Download album tracks"
                  style={[styles.actionButton, styles.downloadButton]}
                  onPress={() => void downloadAlbum()}
                  disabled={downloading || loading || songs.length === 0}
                >
                  {downloading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="download-outline" size={19} color="#FFFFFF" />
                  )}
                  <Text style={styles.actionButtonText}>
                    {downloading ? "Downloading" : "Download"}
                  </Text>
                </Pressable>
              </View>

              {downloadProgress ? (
                <Text style={styles.downloadProgress}>{downloadProgress}</Text>
              ) : null}

              <Pressable
                style={styles.playAllButton}
                onPress={() => {
                  const firstPlayableSong = songs.find((song) => song.audio_src?.trim());
                  if (firstPlayableSong) {
                    handlePlay(firstPlayableSong);
                  } else {
                    setPlaybackError("There are no playable audio sources in this album.");
                  }
                }}
              >
                <Ionicons name="play" size={20} color="#FFFFFF" />
                <Text style={styles.playAllText}>Play Album</Text>
              </Pressable>
            </View>

            {activeSongId ? (
              <View style={styles.nowPlaying}>
                <Ionicons name="volume-high" size={20} color="#1DB954" />
                <View style={styles.nowPlayingInfo}>
                  <Text style={styles.nowPlayingLabel}>NOW PLAYING</Text>
                  <Text style={styles.nowPlayingStatus}>
                    {playerStatus.playing ? "Playing" : "Paused"}
                  </Text>
                </View>
                <Pressable style={styles.stopButton} onPress={stopPlayer}>
                  <Ionicons name="stop-circle-outline" size={26} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : null}

            {playbackError ? <Text style={styles.errorText}>{playbackError}</Text> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Text style={styles.sectionTitle}>Tracks</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerMessage}>
              <ActivityIndicator size="large" color="#1DB954" />
              <Text style={styles.messageText}>Loading album songs...</Text>
            </View>
          ) : (
            <View style={styles.centerMessage}>
              <Ionicons name="musical-notes-outline" size={38} color="#888888" />
              <Text style={styles.messageText}>{error || "No songs available."}</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101010",
  },
  topBar: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#242424",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  topBarTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
  },
  topBarSpacer: {
    width: 40,
  },
  listContent: {
    paddingBottom: 35,
  },
  albumHeader: {
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 25,
    paddingBottom: 25,
  },
  albumCover: {
    width: 190,
    height: 190,
    borderRadius: 12,
    backgroundColor: "#282828",
  },
  placeholderCover: {
    backgroundColor: "#292929",
    alignItems: "center",
    justifyContent: "center",
  },
  albumTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 18,
  },
  albumYear: {
    color: "#BBBBBB",
    fontSize: 14,
    marginTop: 7,
  },
  trackCount: {
    color: "#999999",
    fontSize: 13,
    marginTop: 7,
  },
  albumActions: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 18,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#252525",
    borderWidth: 1,
    borderColor: "#383838",
    borderRadius: 22,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  favoriteButtonActive: {
    borderColor: "#FF5C7A",
    backgroundColor: "#321C24",
  },
  downloadButton: {
    backgroundColor: "#176B3A",
    borderColor: "#21894D",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  downloadProgress: {
    color: "#BBBBBB",
    fontSize: 12,
    marginTop: 12,
    textAlign: "center",
  },
  playAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1DB954",
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 18,
    gap: 8,
  },
  playAllText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  nowPlaying: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 18,
    padding: 13,
    backgroundColor: "#202020",
    borderRadius: 12,
  },
  nowPlayingInfo: {
    flex: 1,
    marginLeft: 10,
  },
  nowPlayingLabel: {
    color: "#1DB954",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  nowPlayingStatus: {
    color: "#FFFFFF",
    fontSize: 14,
    marginTop: 3,
  },
  stopButton: {
    padding: 4,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginHorizontal: 18,
    marginBottom: 10,
    marginTop: 6,
  },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
    minHeight: 78,
  },
  trackNumber: {
    width: 25,
    color: "#999999",
    fontSize: 13,
  },
  songCover: {
    width: 52,
    height: 52,
    borderRadius: 7,
    backgroundColor: "#282828",
  },
  songInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  songTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  songArtist: {
    color: "#AAAAAA",
    fontSize: 12,
    marginTop: 4,
  },
  songDuration: {
    color: "#777777",
    fontSize: 11,
    marginTop: 3,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1DB954",
    alignItems: "center",
    justifyContent: "center",
  },
  centerMessage: {
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 12,
  },
  messageText: {
    color: "#BBBBBB",
    fontSize: 14,
    textAlign: "center",
  },
  errorText: {
    color: "#FF7777",
    fontSize: 13,
    marginHorizontal: 18,
    marginBottom: 12,
  },
});
