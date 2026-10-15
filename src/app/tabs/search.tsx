
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { malawiLog } from "../../components/MalawiSongsLog";
import { useSharedAudio } from "../../context/AudioPlayerContext";

const API_BASE = "https://api.malawisongs.com/api/lupakisho";

type Song = {
  song_id: string;
  title: string;
  artist_id?: string;
  artist_name?: string | null;
  album_id?: string | null;
  image?: string | null;
  plays_count?: number;
  audio_src?: string | null;
  audio_locked?: boolean;
  has_price?: boolean;
  price?: number | string | null;
};

type Artist = {
  artist_id: string;
  name?: string | null;
  image?: string | null;
  songs_count?: number;
  is_verified?: boolean;
};

type Album = {
  album_id: string;
  title: string;
  year?: string | number;
  image?: string | null;
  track_count?: number;
  total_tracks?: number;
  streams?: string | number;
};

type SearchCategory = "All" | "Songs" | "Artists" | "Albums";

type CatalogueResponse = {
  status?: string;
  data?: unknown;
  query?: {
    data?: unknown;
  };
};

export default function SearchScreen() {
  const { playSong } = useSharedAudio();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>("All");

  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCatalogue = useCallback(async () => {
    setLoading(true);
    setError("");

    malawiLog("Search screen: loading music catalogue", "WAIT");

    try {
      const endpoints = [
        `${API_BASE}/songs?page=1&limit=100`,
        `${API_BASE}/artists?page=1&limit=100`,
        `${API_BASE}/albums`,
      ];

      const responses = await Promise.all(
        endpoints.map((url) => fetch(url))
      );

      const failedResponse = responses.find(
        (response) => !response.ok
      );

      if (failedResponse) {
        throw new Error(
          `Catalogue API returned status ${failedResponse.status}`
        );
      }

      const [songResult, artistResult, albumResult] =
        (await Promise.all(
          responses.map(
            (response) =>
              response.json() as Promise<CatalogueResponse>
          )
        )) as [
          CatalogueResponse,
          CatalogueResponse,
          CatalogueResponse
        ];

      const songData = songResult.data;
      const artistData = artistResult.data;
      const albumData =
        albumResult.data ?? albumResult.query?.data;

      if (!Array.isArray(songData)) {
        throw new Error("The songs API returned an invalid response.");
      }

      if (!Array.isArray(artistData)) {
        throw new Error("The artists API returned an invalid response.");
      }

      if (!Array.isArray(albumData)) {
        throw new Error("The albums API returned an invalid response.");
      }

      setSongs(songData as Song[]);
      setArtists(artistData as Artist[]);
      setAlbums(albumData as Album[]);

      malawiLog(
        `Search catalogue loaded: ${songData.length} songs, ${artistData.length} artists, ${albumData.length} albums`,
        "SUCCESS"
      );
    } catch (err) {
      console.error("Search catalogue error:", err);

      const message =
        err instanceof Error ? err.message : "Unknown error";

      setError(
        "Could not load the search catalogue. Check your internet connection and API endpoints."
      );

      malawiLog(`Search catalogue failed: ${message}`, "ERROR");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    malawiLog("Search screen opened", "INFO");
    loadCatalogue();
  }, [loadCatalogue]);

  const searchTerm = query.trim().toLowerCase();

  const filteredSongs = useMemo(
    () =>
      songs.filter((song) =>
        `${song.title ?? ""} ${song.artist_name ?? ""}`
          .toLowerCase()
          .includes(searchTerm)
      ),
    [songs, searchTerm]
  );

  const filteredArtists = useMemo(
    () =>
      artists.filter((artist) =>
        (artist.name ?? "").toLowerCase().includes(searchTerm)
      ),
    [artists, searchTerm]
  );

  const filteredAlbums = useMemo(
    () =>
      albums.filter((album) =>
        (album.title ?? "").toLowerCase().includes(searchTerm)
      ),
    [albums, searchTerm]
  );

  const showSongs = category === "All" || category === "Songs";
  const showArtists = category === "All" || category === "Artists";
  const showAlbums = category === "All" || category === "Albums";

  const totalResults =
    (showSongs ? filteredSongs.length : 0) +
    (showArtists ? filteredArtists.length : 0) +
    (showAlbums ? filteredAlbums.length : 0);

  const openArtist = (artist: Artist) => {
    malawiLog(
      `Opening artist: ${artist.name || "Unknown Artist"}`,
      "INFO"
    );

    router.push({
      pathname: "/artists/[id]",
      params: {
        id: artist.artist_id,
        name: artist.name || "Unknown Artist",
      },
    } as any);
  };

  const openAlbum = (album: Album) => {
    malawiLog(
      `Opening album: ${album.title || "Untitled Album"}`,
      "INFO"
    );

    router.push({
      pathname: "/albums/[id]",
      params: {
        id: album.album_id,
        title: album.title,
        year: String(album.year ?? ""),
        image: album.image ?? "",
      },
    } as any);
  };

  const selectSong = (song: Song) => {
    malawiLog(
      `Song selected: ${song.title || "Unknown Song"}`,
      "INFO"
    );

    if (song.audio_locked === true) {
      Alert.alert(
        "Song is locked",
        song.has_price
          ? `This song requires authorized access${song.price != null ? ` (listed price: ${song.price})` : ""}. The app needs the backend's purchase or playback feature to play it.`
          : "This song requires authorized access before it can be played."
      );
      return;
    }

    const audioUrl = song.audio_src?.trim();

    if (!audioUrl) {
      malawiLog(
        `No audio source available for song: ${song.title}`,
        "ERROR"
      );

      Alert.alert(
        "Audio unavailable",
        "The server has not provided an audio file for this song yet. Please try again later."
      );
      return;
    }

    const playableQueue = songs
      .filter(
        (item) =>
          item.audio_locked !== true &&
          Boolean(item.audio_src?.trim())
      )
      .map((item) => ({
        songId: item.song_id,
        audioUrl: item.audio_src!.trim(),
        title: item.title || "Untitled Song",
        artist: item.artist_name || "Unknown Artist",
        image: item.image ?? null,
      }));

    playSong(
      song.song_id,
      audioUrl,
      playableQueue
    );

    malawiLog(
      `Requesting playback: ${song.title}`,
      "SUCCESS"
    );
  };

  const renderSong = ({ item }: { item: Song }) => {
    const unavailable =
      item.audio_locked === true || !item.audio_src?.trim();

    return (
      <Pressable
        style={styles.resultRow}
        onPress={() => selectSong(item)}
        accessibilityRole="button"
        accessibilityLabel={`Select song ${item.title}`}
      >
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.resultImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.resultImage, styles.placeholder]}>
            <Ionicons
              name="musical-notes"
              size={23}
              color="#A7B0C0"
            />
          </View>
        )}

        <View style={styles.resultDetails}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {item.title || "Untitled Song"}
          </Text>

          <Text style={styles.resultSubtitle} numberOfLines={1}>
            {item.artist_name || "Malawi Artist"} ·{" "}
            {unavailable ? "Audio unavailable or locked" : "Song"}
          </Text>
        </View>

        <Ionicons
          name={unavailable ? "lock-closed-outline" : "play-circle-outline"}
          size={23}
          color={unavailable ? "#A7B0C0" : "#208AEF"}
        />
      </Pressable>
    );
  };

  const renderArtist = ({ item }: { item: Artist }) => (
    <Pressable
      style={styles.resultRow}
      onPress={() => openArtist(item)}
      accessibilityRole="button"
      accessibilityLabel={`Open artist ${item.name || "Unknown Artist"}`}
    >
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          style={[styles.resultImage, styles.artistImage]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.resultImage,
            styles.artistImage,
            styles.placeholder,
          ]}
        >
          <Ionicons name="person" size={24} color="#A7B0C0" />
        </View>
      )}

      <View style={styles.resultDetails}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.name || "Unknown Artist"}
        </Text>

        <Text style={styles.resultSubtitle}>
          {item.songs_count ?? 0} songs · Artist
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color="#8B96AA"
      />
    </Pressable>
  );

  const renderAlbum = ({ item }: { item: Album }) => (
    <Pressable
      style={styles.resultRow}
      onPress={() => openAlbum(item)}
      accessibilityRole="button"
      accessibilityLabel={`Open album ${item.title}`}
    >
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          style={styles.resultImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.resultImage, styles.placeholder]}>
          <Ionicons
            name="disc-outline"
            size={24}
            color="#A7B0C0"
          />
        </View>
      )}

      <View style={styles.resultDetails}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.title || "Untitled Album"}
        </Text>

        <Text style={styles.resultSubtitle}>
          {item.year ?? "Album"} ·{" "}
          {item.track_count ?? item.total_tracks ?? 0} tracks
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color="#8B96AA"
      />
    </Pressable>
  );

  const renderSection = (
    title: string,
    icon: keyof typeof Ionicons.glyphMap,
    count: number,
    content: React.ReactNode
  ) => {
    if (count === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeading}>
            <Ionicons name={icon} size={19} color="#208AEF" />
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>

          <Text style={styles.sectionCount}>{count}</Text>
        </View>

        {content}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>FIND YOUR SOUND</Text>

        <Text style={styles.heading}>Search</Text>

        <Text style={styles.subtitle}>
          Discover songs, artists and albums from Malawi.
        </Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons
          name="search-outline"
          size={22}
          color="#A7B0C0"
        />

        <TextInput
          style={styles.searchInput}
          placeholder="What do you want to hear?"
          placeholderTextColor="#8B96AA"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search songs, artists and albums"
        />

        {query.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setQuery("")}
          >
            <Ionicons
              name="close-circle"
              size={21}
              color="#A7B0C0"
            />
          </Pressable>
        )}
      </View>

      <View style={styles.categoryRow}>
        {(["All", "Songs", "Artists", "Albums"] as SearchCategory[]).map(
          (item) => (
            <Pressable
              key={item}
              onPress={() => {
                setCategory(item);
                malawiLog(`Search category selected: ${item}`, "INFO");
              }}
              style={[
                styles.categoryButton,
                category === item && styles.categoryButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  category === item && styles.categoryTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          )
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#208AEF" />
          <Text style={styles.message}>
            Loading music catalogue...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color="#8B96AA"
          />

          <Text style={styles.emptyTitle}>
            Search is unavailable
          </Text>

          <Text style={styles.message}>{error}</Text>

          <Pressable
            style={styles.retryButton}
            onPress={loadCatalogue}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={[{ key: "search-results" }]}
          keyExtractor={(item) => item.key}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={() => (
            <View>
              {!searchTerm ? (
                <View style={styles.welcome}>
                  <View style={styles.welcomeIcon}>
                    <Ionicons
                      name="search"
                      size={30}
                      color="#208AEF"
                    />
                  </View>

                  <Text style={styles.welcomeTitle}>
                    What are you looking for?
                  </Text>

                  <Text style={styles.welcomeText}>
                    Search by song title, artist name or album title.
                  </Text>
                </View>
              ) : totalResults === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="search-outline"
                    size={50}
                    color="#52617A"
                  />

                  <Text style={styles.emptyTitle}>
                    No results found
                  </Text>

                  <Text style={styles.message}>
                    Try another title or choose a different category.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.resultSummary}>
                    {totalResults} results for "{query.trim()}"
                  </Text>

                  {showSongs &&
                    renderSection(
                      "Songs",
                      "musical-notes-outline",
                      filteredSongs.length,
                      filteredSongs.slice(0, 10).map((song, index) => (
                        <View
                          key={song.song_id || `song-${index}`}
                        >
                          {renderSong({ item: song })}
                        </View>
                      ))
                    )}

                  {showArtists &&
                    renderSection(
                      "Artists",
                      "people-outline",
                      filteredArtists.length,
                      filteredArtists.slice(0, 10).map((artist, index) => (
                        <View
                          key={artist.artist_id || `artist-${index}`}
                        >
                          {renderArtist({ item: artist })}
                        </View>
                      ))
                    )}

                  {showAlbums &&
                    renderSection(
                      "Albums",
                      "albums-outline",
                      filteredAlbums.length,
                      filteredAlbums.slice(0, 10).map((album, index) => (
                        <View
                          key={album.album_id || `album-${index}`}
                        >
                          {renderAlbum({ item: album })}
                        </View>
                      ))
                    )}

                  <Text style={styles.footerNote}>
                    Showing up to 10 results per category from the loaded catalogue.
                  </Text>
                </>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1020",
    paddingTop: 52,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  eyebrow: {
    color: "#208AEF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 7,
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: "#A7B0C0",
    fontSize: 13,
    marginTop: 7,
    lineHeight: 19,
  },
  searchBox: {
    height: 54,
    marginHorizontal: 20,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171F33",
    borderWidth: 1,
    borderColor: "#27334D",
    borderRadius: 16,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    marginLeft: 11,
    paddingVertical: 10,
  },
  categoryRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginTop: 17,
    marginBottom: 18,
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: "#171F33",
    borderWidth: 1,
    borderColor: "#27334D",
  },
  categoryButtonActive: {
    backgroundColor: "#208AEF",
    borderColor: "#208AEF",
  },
  categoryText: {
    color: "#A7B0C0",
    fontSize: 12,
    fontWeight: "600",
  },
  categoryTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 35,
  },
  resultSummary: {
    color: "#A7B0C0",
    fontSize: 12,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  sectionCount: {
    color: "#8B96AA",
    fontSize: 12,
  },
  resultRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171F33",
    borderWidth: 1,
    borderColor: "#27334D",
    borderRadius: 13,
    padding: 10,
    marginBottom: 9,
  },
  resultImage: {
    width: 49,
    height: 49,
    borderRadius: 9,
    backgroundColor: "#27334D",
  },
  artistImage: {
    borderRadius: 25,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  resultDetails: {
    flex: 1,
    marginHorizontal: 12,
  },
  resultTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  resultSubtitle: {
    color: "#A7B0C0",
    fontSize: 11,
    marginTop: 5,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
  },
  message: {
    color: "#A7B0C0",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 12,
  },
  welcome: {
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 60,
  },
  welcomeIcon: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: "#142A47",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  welcomeTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  welcomeText: {
    color: "#A7B0C0",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 9,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 55,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 15,
  },
  retryButton: {
    backgroundColor: "#208AEF",
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 11,
    marginTop: 18,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  footerNote: {
    color: "#8B96AA",
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 17,
  },
});
