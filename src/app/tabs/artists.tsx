

import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { malawiLog } from "../../components/MalawiSongsLog";

const API_URL = "https://api.malawisongs.com/api/lupakisho/artists";

type Artist = {
  artist_id: string;
  name: string | null;
  image?: string | null;
  biography?: string | null;
  genres?: string[];
  songs_count?: number;
  is_verified?: boolean;
};

type ArtistsResponse = {
  status: string;
  data: Artist[];
  pagination?: {
    current_page: number;
    last_page: number;
    total: number;
    has_more: boolean;
  };
};

export default function Artists() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadArtists = useCallback(
    async (pageNumber: number, append = false) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        setError("");

        malawiLog(
          `Loading artists, page ${pageNumber}`,
          "API"
        );

        const response = await fetch(
          `${API_URL}?page=${pageNumber}&limit=25`
        );

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const result: ArtistsResponse = await response.json();

        if (
          result.status !== "ok" ||
          !Array.isArray(result.data)
        ) {
          throw new Error("The artists response was invalid.");
        }

        setArtists((previous) => {
          if (!append) {
            return result.data;
          }

          const existingIds = new Set(
            previous.map((artist) => artist.artist_id)
          );

          return [
            ...previous,
            ...result.data.filter(
              (artist) => !existingIds.has(artist.artist_id)
            ),
          ];
        });

        setPage(pageNumber);
        setHasMore(result.pagination?.has_more ?? false);

        malawiLog(
          `Loaded ${result.data.length} artists on page ${pageNumber}`,
          "SUCCESS"
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to load artists.";

        setError(message);

        malawiLog(
          `Artist loading failed: ${message}`,
          "ERROR"
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    loadArtists(1);
  }, [loadArtists]);

  const filteredArtists = artists.filter((artist) =>
    (artist.name || "Unknown Artist")
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  const openArtist = (artist: Artist) => {
    malawiLog(
      `Opening artist: ${artist.name || "Unknown Artist"}`,
      "INFO"
    );

    router.push({
  pathname: "/artists/[id]" as any,
  params: {
    id: String(artist.artist_id),
    name: artist.name || "Unknown Artist",
  },
});
    
  };

  const renderArtist = ({ item }: { item: Artist }) => {
    const artistName = item.name || "Unknown Artist";

    return (
      <Pressable
        style={({ pressed }) => [
          styles.artistCard,
          pressed && styles.pressedCard,
        ]}
        onPress={() => openArtist(item)}
      >
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.artistImage}
          />
        ) : (
          <View
            style={[
              styles.artistImage,
              styles.imagePlaceholder,
            ]}
          >
            <Text style={styles.placeholderLetter}>
              {artistName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <Text style={styles.artistName} numberOfLines={2}>
          {artistName}
          {item.is_verified ? " ✓" : ""}
        </Text>

        <Text style={styles.songCount}>
          {item.songs_count ?? 0}{" "}
          {(item.songs_count ?? 0) === 1 ? "song" : "songs"}
        </Text>

        <Text style={styles.viewArtist}>View artist ›</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Artists</Text>

      <Text style={styles.subtitle}>
        Discover your favourite Malawian artists
      </Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search artists..."
        placeholderTextColor="#8B96AA"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color="#208AEF"
          />
          <Text style={styles.message}>
            Loading artists...
          </Text>
        </View>
      ) : error && artists.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => loadArtists(1)}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}

          <FlatList
            data={filteredArtists}
            renderItem={renderArtist}
            keyExtractor={(item) => item.artist_id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.message}>
                No artists found.
              </Text>
            }
            ListFooterComponent={
              hasMore ? (
                <Pressable
                  style={styles.loadMoreButton}
                  disabled={loadingMore}
                  onPress={() => loadArtists(page + 1, true)}
                >
                  {loadingMore ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.loadMoreText}>
                      Load More Artists
                    </Text>
                  )}
                </Pressable>
              ) : (
                <Text style={styles.endText}>
                  You have reached the end of the artists list.
                </Text>
              )
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1020",
    paddingTop: 55,
    paddingHorizontal: 16,
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
  },
  subtitle: {
    color: "#A7B0C0",
    fontSize: 14,
    marginTop: 6,
    marginBottom: 18,
  },
  searchInput: {
    backgroundColor: "#171F33",
    borderWidth: 1,
    borderColor: "#27334D",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: "#FFFFFF",
    fontSize: 15,
    marginBottom: 18,
  },
  list: {
    paddingBottom: 35,
  },
  row: {
    justifyContent: "space-between",
  },
  artistCard: {
    width: "48.5%",
    backgroundColor: "#171F33",
    borderWidth: 1,
    borderColor: "#27334D",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    alignItems: "center",
  },
  pressedCard: {
    opacity: 0.7,
  },
  artistImage: {
    width: 105,
    height: 105,
    borderRadius: 53,
    backgroundColor: "#27334D",
    marginBottom: 12,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderLetter: {
    color: "#208AEF",
    fontSize: 38,
    fontWeight: "bold",
  },
  artistName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
    textAlign: "center",
    minHeight: 38,
  },
  songCount: {
    color: "#A7B0C0",
    fontSize: 12,
    marginTop: 4,
  },
  viewArtist: {
    color: "#208AEF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 10,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    color: "#A7B0C0",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 12,
  },
  error: {
    color: "#FF7777",
    textAlign: "center",
    marginVertical: 12,
  },
  retryButton: {
    backgroundColor: "#208AEF",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 12,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  loadMoreButton: {
    backgroundColor: "#208AEF",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  loadMoreText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  endText: {
    color: "#8B96AA",
    textAlign: "center",
    fontSize: 12,
    paddingVertical: 20,
  },
});
