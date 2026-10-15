


import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { malawiLog } from "../../components/MalawiSongsLog";
import { useSharedAudio } from "../../context/AudioPlayerContext";

const ARTISTS_API =
  "https://api.malawisongs.com/api/lupakisho/artists";

const SONGS_API =
  "https://api.malawisongs.com/api/lupakisho/songs";

type Artist = {
  artist_id: string;
  name: string | null;
  image?: string | null;
  biography?: string | null;
};

type Song = {
  song_id?: string | number;
  id?: string | number;
  title?: string;
  artist_id?: string | number;
  artist_name?: string;
  artist?: string;
  album_id?: string | number;
  image?: string | null;
  cover?: string | null;
  audio_src?: string | null;
  duration?: string | number;
};

type ArtistsResponse = {
  status?: string;
  data?: Artist[];
};

type SongsResponse = {
  status?: string;
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
  return id == null ? "" : String(id);
}

function formatDuration(value?: string | number) {
  if (value == null || value === "") return "--:--";

  if (typeof value === "string" && value.includes(":")) {
    return value;
  }

  const seconds = Number(value);

  if (!Number.isFinite(seconds) || seconds < 0) {
    return "--:--";
  }

  return `${Math.floor(seconds / 60)}:${String(
    Math.floor(seconds % 60)
  ).padStart(2, "0")}`;
}

export default function ArtistDetailsScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    name?: string | string[];
    image?: string | string[];
  }>();

  const artistId = getParam(params.id) || "";
  const routeName = getParam(params.name) || "Artist";
  const routeImage = getParam(params.image) || "";

  const { playerStatus, activeSongId, playSong } = useSharedAudio();

  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadArtist = useCallback(async () => {
    if (!artistId) {
      setError("Artist ID is missing. Go back and select an artist again.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError("");

      malawiLog(`Loading artist details: ${artistId}`, "API");

      // Load artist information.
      const artistResponse = await fetch(
        `${ARTISTS_API}?page=1&limit=100`
      );

      if (artistResponse.ok) {
        const artistResult =
          (await artistResponse.json()) as ArtistsResponse;

        const matchingArtist = (artistResult.data || []).find(
          (item) => String(item.artist_id) === String(artistId)
        );

        if (matchingArtist) {
          setArtist(matchingArtist);
        }
      }

      // Request songs belonging to this artist.
      const songsResponse = await fetch(
        `${SONGS_API}?artist_id=${encodeURIComponent(artistId)}&page=1&limit=100`
      );

      if (!songsResponse.ok) {
        throw new Error(
          `Songs API request failed: ${songsResponse.status}`
        );
      }

      const songsResult =
        (await songsResponse.json()) as SongsResponse;

      const receivedSongs = Array.isArray(songsResult.data)
        ? songsResult.data
        : Array.isArray(songsResult.query?.data)
          ? songsResult.query.data
          : [];

      // Filter locally as well, so unrelated songs are not displayed.
      const matchingSongs = receivedSongs.filter(
        (song) =>
          song.artist_id != null &&
          String(song.artist_id) === String(artistId)
      );

      setSongs(matchingSongs);

      malawiLog(
        `Loaded ${matchingSongs.length} songs for artist ${artistId}`,
        "SUCCESS"
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to load artist songs.";

      setError(message);
      malawiLog(`Artist details error: ${message}`, "ERROR");
      console.error("Artist details error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [artistId]);

  useEffect(() => {
    void loadArtist();
  }, [loadArtist]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadArtist();
  };

  const handlePlay = (song: Song) => {
    const songId = getSongId(song);
    const audioUrl = song.audio_src?.trim();

    if (!songId) {
      setError("This song does not have a valid song ID.");
      return;
    }

    if (!audioUrl) {
      setError(
        `No audio source is available for "${song.title || "this song"}".`
      );

      malawiLog(
        `Missing audio_src for artist song ${songId}`,
        "ERROR"
      );
      return;
    }

    setError("");

    malawiLog(
      `Playing artist song: ${song.title || songId}`,
      "INFO"
    );

    // The shared player replaces the previous track.
    playSong(songId, audioUrl);
  };

  const renderSong = ({
    item,
    index,
  }: {
    item: Song;
    index: number;
  }) => {
    const songId = getSongId(item);
    const isActive = activeSongId === songId;
    const cover = item.image || item.cover || artist?.image || routeImage;

    return (
      <View style={styles.songRow}>
        <Text style={styles.trackNumber}>{index + 1}</Text>

        {cover ? (
          <Image source={{ uri: cover }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.placeholder]}>
            <Ionicons
              name="musical-note"
              size={24}
              color="#FFFFFF"
            />
          </View>
        )}

        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {item.title || "Unknown Song"}
          </Text>

          <Text style={styles.songArtist} numberOfLines={1}>
            {item.artist_name || item.artist || routeName}
          </Text>

          <Text style={styles.duration}>
            {formatDuration(item.duration)}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isActive && playerStatus.playing
              ? `Pause ${item.title || "song"}`
              : `Play ${item.title || "song"}`
          }
          style={styles.playButton}
          onPress={() => handlePlay(item)}
        >
          <Ionicons
            name={
              isActive && playerStatus.playing
                ? "pause"
                : "play"
            }
            size={21}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    );
  };

  const displayName = artist?.name || routeName;
  const displayImage = artist?.image || routeImage;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={25} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.topBarTitle}>Artist Details</Text>
      </View>

      <FlatList
        data={songs}
        renderItem={renderSong}
        keyExtractor={(item, index) =>
          getSongId(item) || `artist-song-${index}`
        }
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#208AEF"
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.artistHeader}>
              {displayImage ? (
                <Image
                  source={{ uri: displayImage }}
                  style={styles.artistImage}
                />
              ) : (
                <View style={[styles.artistImage, styles.placeholder]}>
                  <Ionicons
                    name="person"
                    size={55}
                    color="#FFFFFF"
                  />
                </View>
              )}

              <Text style={styles.artistName}>{displayName}</Text>

              {artist?.biography ? (
                <Text style={styles.biography}>
                  {artist.biography}
                </Text>
              ) : null}

              <Text style={styles.songCount}>
                {songs.length} {songs.length === 1 ? "song" : "songs"}
              </Text>
            </View>

            {activeSongId ? (
              <View style={styles.nowPlaying}>
                <Ionicons
                  name="volume-high"
                  size={21}
                  color="#1DB954"
                />
                <Text style={styles.nowPlayingText}>
                  {playerStatus.playing
                    ? "Music is playing"
                    : "Music is paused"}
                </Text>
              </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.sectionTitle}>Songs</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#208AEF" />
              <Text style={styles.message}>
                Loading artist songs...
              </Text>
            </View>
          ) : (
            <View style={styles.center}>
              <Ionicons
                name="musical-notes-outline"
                size={38}
                color="#8B96AA"
              />
              <Text style={styles.message}>
                No songs were found for this artist.
              </Text>
              <Text style={styles.hint}>
                If this artist has songs on the website, check whether
                the songs API supports filtering by artist_id.
              </Text>
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
    backgroundColor: "#0B1020",
  },
  topBar: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#27334D",
  },
  backButton: {
    width: 42,
    justifyContent: "center",
  },
  topBarTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
  list: {
    paddingBottom: 35,
  },
  artistHeader: {
    alignItems: "center",
    padding: 24,
  },
  artistImage: {
    width: 135,
    height: 135,
    borderRadius: 68,
    backgroundColor: "#27334D",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  artistName: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 17,
  },
  biography: {
    color: "#A7B0C0",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 10,
  },
  songCount: {
    color: "#A7B0C0",
    fontSize: 13,
    marginTop: 8,
  },
  nowPlaying: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171F33",
    marginHorizontal: 16,
    padding: 13,
    borderRadius: 10,
    gap: 10,
  },
  nowPlayingText: {
    color: "#FFFFFF",
    fontSize: 13,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "bold",
    marginHorizontal: 17,
    marginTop: 22,
    marginBottom: 8,
  },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 76,
  },
  trackNumber: {
    width: 25,
    color: "#A7B0C0",
    fontSize: 13,
  },
  cover: {
    width: 52,
    height: 52,
    borderRadius: 7,
    backgroundColor: "#27334D",
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
    color: "#A7B0C0",
    fontSize: 12,
    marginTop: 4,
  },
  duration: {
    color: "#8B96AA",
    fontSize: 11,
    marginTop: 3,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#208AEF",
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  message: {
    color: "#A7B0C0",
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
  },
  hint: {
    color: "#8B96AA",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 8,
  },
  error: {
    color: "#FF7777",
    fontSize: 13,
    marginHorizontal: 17,
    marginTop: 12,
  },
});
