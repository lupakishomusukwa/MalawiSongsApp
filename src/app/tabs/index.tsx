
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSharedAudio, type AudioTrack } from "../../context/AudioPlayerContext";
import { auth } from "../../lib/firebase";

const API_BASE = "https://api.malawisongs.com/api/lupakisho";

type Song = {
  song_id?: string | number;
  id?: string | number;
  title?: string;
  artist_name?: string;
  artist?: string;
  artist_id?: string | number;
  image?: string;
  image_url?: string;
  cover?: string;
  audio_src?: string | null;
  audio_url?: string | null;
  audioUrl?: string | null;
  audio_locked?: boolean;
  has_price?: boolean;
  plays_count?: number;
  [key: string]: unknown;
};

type Artist = {
  artist_id?: string | number;
  id?: string | number;
  artist_name?: string;
  name?: string;
  image?: string;
  image_url?: string;
  [key: string]: unknown;
};

function getList<T>(response: any): T[] {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.artists)) return response.artists;
  if (Array.isArray(response?.songs)) return response.songs;
  return [];
}

function songTitle(song: Song) {
  return song.title || "Untitled Song";
}

function artistName(song: Song) {
  return song.artist_name || song.artist || "Malawi Artist";
}

function songImage(song: Song) {
  const value = song.image || song.image_url || song.cover;
  return typeof value === "string" && value.startsWith("http")
    ? value
    : null;
}

function artistTitle(artist: Artist) {
  return artist.artist_name || artist.name || "Malawian Artist";
}

function artistImage(artist: Artist) {
  const value = artist.image || artist.image_url;
  return typeof value === "string" && value.startsWith("http")
    ? value
    : null;
}

function getAudioUrl(song: Song): string | null {
  const value = song.audio_src || song.audio_url || song.audioUrl;

  if (
    typeof value === "string" &&
    (value.startsWith("https://") || value.startsWith("http://"))
  ) {
    return value;
  }

  return null;
}

function makeQueue(list: Song[]): AudioTrack[] {
  const tracks: AudioTrack[] = [];
  const seen = new Set<string>();

  for (const song of list) {
    const id = song.song_id ?? song.id;
    const url = getAudioUrl(song);

    if (
      id == null ||
      !url ||
      song.audio_locked === true ||
      song.has_price === true
    ) {
      continue;
    }

    const songId = String(id);

    if (seen.has(songId)) continue;
    seen.add(songId);

    tracks.push({
      songId,
      audioUrl: url,
      title: songTitle(song),
      artist: artistName(song),
      image: songImage(song),
    });
  }

  return tracks;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function Artwork({
  uri,
  size,
  radius = 12,
}: {
  uri: string | null;
  size: number;
  radius?: number;
}) {
  return (
    <View
      style={[
        styles.artworkPlaceholder,
        { width: size, height: size, borderRadius: radius },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: radius }}
          resizeMode="cover"
        />
      ) : (
        <Ionicons name="musical-notes" size={size * 0.42} color="#777" />
      )}
    </View>
  );
}

function SectionHeader({
  title,
  onSeeAll,
}: {
  title: string;
  onSeeAll?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function Index() {
  const {
    player,
    playerStatus,
    activeSongId,
    queue,
    playSong,
    playNext,
    playPrevious,
    seekTo,
    stopPlayer,
  } = useSharedAudio();

  const [songs, setSongs] = useState<Song[]>([]);
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [progressWidth, setProgressWidth] = useState(1);

  // ADDED: Controls whether the mini-player is visible.
  const [miniPlayerVisible, setMiniPlayerVisible] = useState(true);

  const currentTrack = queue.find(
    (track) => track.songId === activeSongId
  );

  // ADDED: Show the mini-player again when a different song is selected.
  useEffect(() => {
    setMiniPlayerVisible(true);
  }, [activeSongId]);

  const duration = playerStatus.duration || 0;
  const currentTime = playerStatus.currentTime || 0;
  const progress =
    duration > 0 ? Math.min(currentTime / duration, 1) : 0;

  async function handleLogout() {
    if (loggingOut) return;

    Alert.alert(
      "Log out",
      "Are you sure you want to log out of MalawiSongs?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: async () => {
            try {
              setLoggingOut(true);
              stopPlayer();
              await signOut(auth);
              router.replace("/login");
            } catch {
              setLoggingOut(false);
              Alert.alert(
                "Logout failed",
                "Unable to log out. Please check your connection and try again."
              );
            }
          },
        },
      ]
    );
  }

  function handleTrendingSongPress(song: Song) {
    const songId = song.song_id ?? song.id;
    const audioUrl = getAudioUrl(song);

    if (song.audio_locked || song.has_price) {
      Alert.alert(
        "Playback unavailable",
        "This song requires authorization or purchase."
      );
      return;
    }

    if (songId == null || !audioUrl) {
      Alert.alert(
        "Playback unavailable",
        "The audio link for this song is missing from the Home screen data."
      );
      return;
    }

    const availableTracks = makeQueue(trendingSongs);
    const selectedId = String(songId);

    if (!availableTracks.some((track) => track.songId === selectedId)) {
      Alert.alert(
        "Playback unavailable",
        "This song could not be added to the playback queue."
      );
      return;
    }

    playSong(selectedId, audioUrl, availableTracks);
  }

  function handleProgressPress(event: any) {
    if (duration <= 0 || progressWidth <= 0) return;

    const position = event.nativeEvent.locationX / progressWidth;
    seekTo(Math.max(0, Math.min(position, 1)) * duration);
  }

  useEffect(() => {
    let active = true;

    async function loadHomeData() {
      try {
        setLoading(true);
        setError("");

        const results = await Promise.allSettled([
          fetch(`${API_BASE}/songs?page=1&limit=10`),
          fetch(`${API_BASE}/songs?sort=trending&page=1&limit=10`),
          fetch(`${API_BASE}/artists?page=1&limit=10`),
        ]);

        const [songsResult, trendingResult, artistsResult] = results;

        let allSongs: Song[] = [];
        let trending: Song[] = [];
        let allArtists: Artist[] = [];

        if (songsResult.status === "fulfilled" && songsResult.value.ok) {
          allSongs = getList<Song>(await songsResult.value.json());
        }

        if (
          trendingResult.status === "fulfilled" &&
          trendingResult.value.ok
        ) {
          trending = getList<Song>(await trendingResult.value.json());
        }

        if (
          artistsResult.status === "fulfilled" &&
          artistsResult.value.ok
        ) {
          allArtists = getList<Artist>(await artistsResult.value.json());
        }

        if (!active) return;

        setSongs(allSongs);
        setTrendingSongs(trending.length ? trending : allSongs);
        setArtists(allArtists);

        if (!allSongs.length && !trending.length && !allArtists.length) {
          setError(
            "We couldn't load Home screen data. Please try again."
          );
        }
      } catch {
        if (active) {
          setError(
            "Unable to connect to MalawiSongs. Check your internet."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadHomeData();

    return () => {
      active = false;
    };
  }, []);

  const featuredSong = trendingSongs[0] || songs[0];

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Text style={styles.greeting}>Welcome to</Text>
            <Text style={styles.logo}>MalawiSongs</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              style={styles.headerIconButton}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              onPress={() => {}}
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#FFFFFF"
              />
            </Pressable>

            <Pressable
              style={[
                styles.logoutButton,
                loggingOut && styles.logoutButtonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Log out"
              onPress={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons
                    name="log-out-outline"
                    size={19}
                    color="#FFFFFF"
                  />
                  <Text style={styles.logoutText}>Logout</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Discover the best music from Malawi
        </Text>

        {/* SEARCH */}
        <Pressable
          style={styles.searchContainer}
          onPress={() => router.push("/tabs/search")}
        >
          <Ionicons name="search-outline" size={21} color="#A7B0C0" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search songs, artists..."
            placeholderTextColor="#888"
            editable={false}
            pointerEvents="none"
          />
        </Pressable>

        {loading && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color="#35D07F" />
            <Text style={styles.statusText}>Loading MalawiSongs...</Text>
          </View>
        )}

        {!!error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => router.replace("/tabs")}>
              <Text style={styles.retryText}>Reload Home</Text>
            </Pressable>
          </View>
        )}

        {/* FEATURED MUSIC */}
        <Text style={styles.sectionTitle}>Featured Music</Text>

        <View style={styles.featuredCard}>
          <Artwork
            uri={featuredSong ? songImage(featuredSong) : null}
            size={72}
          />

          <View style={styles.musicInfo}>
            <Text style={styles.songTitle} numberOfLines={2}>
              {featuredSong ? songTitle(featuredSong) : "Featured Music"}
            </Text>
            <Text style={styles.artistName} numberOfLines={1}>
              {featuredSong
                ? artistName(featuredSong)
                : "Discover Malawian music"}
            </Text>
          </View>

          <Pressable
            style={styles.playButton}
            accessibilityRole="button"
            accessibilityLabel="Open songs"
            onPress={() => router.push("/tabs/songs")}
          >
            <Ionicons name="play" size={19} color="#fff" />
          </Pressable>
        </View>

        {/* TRENDING SONGS */}
        <SectionHeader
          title="Trending Songs"
          onSeeAll={() => router.push("/tabs/songs")}
        />

        {trendingSongs.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {trendingSongs.slice(0, 10).map((song, index) => (
              <Pressable
                style={styles.songCard}
                key={String(song.song_id ?? song.id ?? index)}
                onPress={() => handleTrendingSongPress(song)}
                accessibilityRole="button"
                accessibilityLabel={`Play ${songTitle(song)} by ${artistName(song)}`}
              >
                <Artwork uri={songImage(song)} size={150} />
                <Text style={styles.cardSongTitle} numberOfLines={2}>
                  {songTitle(song)}
                </Text>
                <Text style={styles.cardArtist} numberOfLines={1}>
                  {artistName(song)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          !loading && (
            <Text style={styles.emptyText}>No trending songs available.</Text>
          )
        )}

        {/* POPULAR ARTISTS */}
        <SectionHeader
          title="Popular Artists"
          onSeeAll={() => router.push("/tabs/artists")}
        />

        {artists.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {artists.slice(0, 10).map((artist, index) => (
              <Pressable
                style={styles.artistCard}
                key={String(artist.artist_id ?? artist.id ?? index)}
                onPress={() => router.push("/tabs/artists")}
              >
                {artistImage(artist) ? (
                  <Image
                    source={{ uri: artistImage(artist)! }}
                    style={styles.artistImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.artistImage}>
                    <Ionicons name="person" size={45} color="#777" />
                  </View>
                )}

                <Text style={styles.artistCardName} numberOfLines={2}>
                  {artistTitle(artist)}
                </Text>
                <Text style={styles.artistType}>Artist</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          !loading && (
            <Text style={styles.emptyText}>No artists available.</Text>
          )
        )}

        {/* RECENTLY PLAYED */}
        <SectionHeader
          title="Recently Played"
          onSeeAll={() => router.push("/tabs/songs")}
        />

        <Text style={styles.helperText}>
          Discover songs from the MalawiSongs catalogue.
        </Text>

        {songs.slice(0, 3).map((song, index) => (
          <Pressable
            style={styles.recentSong}
            key={String(song.song_id ?? song.id ?? index)}
            onPress={() => router.push("/tabs/songs")}
          >
            <Artwork uri={songImage(song)} size={58} />
            <View style={styles.recentInfo}>
              <Text style={styles.recentTitle} numberOfLines={1}>
                {songTitle(song)}
              </Text>
              <Text style={styles.recentArtist} numberOfLines={1}>
                {artistName(song)}
              </Text>
            </View>
            <Ionicons
              name="play-circle-outline"
              size={28}
              color="#FFFFFF"
            />
          </Pressable>
        ))}

        {/* MUSIC CATEGORIES */}
        <SectionHeader title="Music Categories" />

        <View style={styles.categoriesContainer}>
          {[
            { name: "Gospel", icon: "heart-outline" as const },
            { name: "Hip Hop", icon: "mic-outline" as const },
            { name: "Afrobeat", icon: "musical-notes-outline" as const },
            { name: "Dancehall", icon: "radio-outline" as const },
            { name: "Love Songs", icon: "heart-outline" as const },
            { name: "Amapiano", icon: "headset-outline" as const },
          ].map((category) => (
            <Pressable
              style={styles.categoryCard}
              key={category.name}
              onPress={() =>
                router.push({
                  pathname: "/tabs/songs",
                  params: { category: category.name },
                })
              }
            >
              <Ionicons name={category.icon} size={30} color="#35D07F" />
              <Text style={styles.categoryName}>{category.name}</Text>
            </Pressable>
          ))}
        </View>

        {/* TOP CHARTS */}
        <SectionHeader
          title="Top Charts"
          onSeeAll={() => router.push("/tabs/songs")}
        />

        {(trendingSongs.length
          ? trendingSongs.slice(0, 5)
          : songs.slice(0, 5)
        ).map((song, index) => (
          <Pressable
            style={styles.chartItem}
            key={String(song.song_id ?? song.id ?? index)}
            onPress={() => handleTrendingSongPress(song)}
            accessibilityRole="button"
            accessibilityLabel={`Play ${songTitle(song)} by ${artistName(song)}`}
          >
            <Text style={styles.chartNumber}>
              {String(index + 1).padStart(2, "0")}
            </Text>

            <Artwork uri={songImage(song)} size={55} radius={10} />

            <View style={styles.chartInfo}>
              <Text style={styles.chartSongTitle} numberOfLines={1}>
                {songTitle(song)}
              </Text>
              <Text style={styles.chartArtist} numberOfLines={1}>
                {artistName(song)}
              </Text>
            </View>

            <Ionicons
              name="play-circle-outline"
              size={27}
              color="#FFFFFF"
            />
          </Pressable>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* MINI MUSIC PLAYER */}
      {currentTrack && miniPlayerVisible && (
        <View style={styles.playerBar}>
          <View style={styles.playerSongRow}>
            <Artwork uri={currentTrack.image || null} size={46} radius={8} />

            <View style={styles.playerSongInfo}>
              <Text style={styles.playerTitle} numberOfLines={1}>
                {currentTrack.title}
              </Text>
              <Text style={styles.playerArtist} numberOfLines={1}>
                {currentTrack.artist}
              </Text>
            </View>

            <Pressable
              style={styles.playerControl}
              accessibilityRole="button"
              accessibilityLabel="Previous song"
              onPress={playPrevious}
            >
              <Ionicons name="play-skip-back" size={23} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={styles.mainPlayerControl}
              accessibilityRole="button"
              accessibilityLabel={playerStatus.playing ? "Pause" : "Play"}
              onPress={() => {
                if (playerStatus.playing) {
                  player.pause();
                } else {
                  player.play();
                }
              }}
            >
              <Ionicons
                name={playerStatus.playing ? "pause" : "play"}
                size={25}
                color="#0B1020"
              />
            </Pressable>

            <Pressable
              style={styles.playerControl}
              accessibilityRole="button"
              accessibilityLabel="Next song"
              onPress={playNext}
            >
              <Ionicons name="play-skip-forward" size={23} color="#FFFFFF" />
            </Pressable>

            {/* ADDED: CLOSE BUTTON */}
            <Pressable
  style={styles.closePlayerButton}
  accessibilityRole="button"
  accessibilityLabel="Close player and stop music"
  onPress={() => {
    stopPlayer();
    setMiniPlayerVisible(false);
  }}
  hitSlop={8}
>
  <Ionicons name="close" size={23} color="#FFFFFF" />
</Pressable>
          </View>

          <View style={styles.progressRow}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>

            <Pressable
              style={styles.progressTrack}
              onLayout={(event) =>
                setProgressWidth(event.nativeEvent.layout.width)
              }
              onPress={handleProgressPress}
              accessibilityRole="adjustable"
              accessibilityLabel="Song progress"
            >
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress * 100}%` },
                ]}
              />
              <View
                style={[
                  styles.progressThumb,
                  { left: `${progress * 100}%` },
                ]}
              />
            </Pressable>

            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0B1020",
  },
  container: {
    flex: 1,
    backgroundColor: "#0B1020",
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 18,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 50,
  },
  headerTitle: {
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconButton: {
    width: 38,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#B83245",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  greeting: {
    fontSize: 15,
    color: "#A7B0C0",
  },
  logo: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 3,
  },
  subtitle: {
    fontSize: 16,
    color: "#A7B0C0",
    marginTop: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171F33",
    borderRadius: 14,
    paddingHorizontal: 15,
    marginTop: 20,
    height: 52,
    borderWidth: 1,
    borderColor: "#27334D",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    color: "#FFFFFF",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 24,
    marginBottom: 15,
  },
  seeAll: {
    fontSize: 14,
    color: "#35D07F",
    marginTop: 24,
    marginBottom: 15,
  },
  featuredCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171F33",
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: "#27334D",
  },
  artworkPlaceholder: {
    backgroundColor: "#27334D",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  musicInfo: {
    flex: 1,
    marginLeft: 15,
  },
  songTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  artistName: {
    fontSize: 14,
    color: "#A7B0C0",
    marginTop: 5,
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#208AEF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  songCard: {
    width: 150,
    marginRight: 15,
  },
  cardSongTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 8,
    color: "#FFFFFF",
  },
  cardArtist: {
    fontSize: 14,
    color: "#A7B0C0",
    marginTop: 3,
  },
  artistCard: {
    width: 120,
    marginRight: 20,
    alignItems: "center",
  },
  artistImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#27334D",
    alignItems: "center",
    justifyContent: "center",
  },
  artistCardName: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
    textAlign: "center",
    color: "#FFFFFF",
  },
  artistType: {
    fontSize: 13,
    color: "#A7B0C0",
    marginTop: 3,
  },
  recentSong: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171F33",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#27334D",
  },
  recentInfo: {
    flex: 1,
    marginLeft: 14,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  recentArtist: {
    fontSize: 14,
    color: "#A7B0C0",
    marginTop: 4,
  },
  helperText: {
    fontSize: 13,
    color: "#A7B0C0",
    marginBottom: 12,
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryCard: {
    width: "31%",
    height: 100,
    backgroundColor: "#171F33",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#27334D",
  },
  categoryName: {
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 8,
    color: "#FFFFFF",
  },
  chartItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171F33",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#27334D",
  },
  chartNumber: {
    width: 30,
    fontSize: 15,
    fontWeight: "bold",
    color: "#35D07F",
    textAlign: "center",
  },
  chartInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chartSongTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  chartArtist: {
    fontSize: 14,
    color: "#A7B0C0",
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    gap: 10,
  },
  statusText: {
    fontSize: 14,
    color: "#A7B0C0",
  },
  errorContainer: {
    backgroundColor: "#351D2A",
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#703044",
  },
  errorText: {
    color: "#FF8A9B",
    fontSize: 14,
  },
  retryText: {
    color: "#35D07F",
    fontWeight: "bold",
    marginTop: 8,
  },
  emptyText: {
    color: "#A7B0C0",
    fontSize: 14,
    marginBottom: 8,
  },
  playerBar: {
    backgroundColor: "#171F33",
    borderTopWidth: 1,
    borderTopColor: "#35D07F",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  playerSongRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  playerSongInfo: {
    flex: 1,
    minWidth: 0,
  },
  playerTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },
  playerArtist: {
    color: "#A7B0C0",
    fontSize: 12,
    marginTop: 3,
  },
  playerControl: {
    width: 30,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  mainPlayerControl: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#35D07F",
    alignItems: "center",
    justifyContent: "center",
  },
  // ADDED: Styling for the close button.
  closePlayerButton: {
    width: 28,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  timeText: {
    color: "#A7B0C0",
    fontSize: 10,
    minWidth: 30,
    textAlign: "center",
  },
  progressTrack: {
    flex: 1,
    height: 18,
    justifyContent: "center",
    backgroundColor: "#303B51",
    borderRadius: 5,
  },
  progressFill: {
    height: 4,
    backgroundColor: "#35D07F",
    borderRadius: 5,
  },
  progressThumb: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
    marginLeft: -5,
  },
});