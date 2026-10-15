

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

const API_URL = "https://api.malawisongs.com/api/lupakisho/albums";

type Album = {
  album_id?: string | number;
  id?: string | number;
  albumId?: string | number;
  title?: string;
  name?: string;
  year?: string | number | null;
  track_count?: number;
  total_tracks?: number;
  streams?: number | string;
  image?: string | null;
  cover?: string | null;
  cover_image?: string | null;
  [key: string]: unknown;
};

export default function AlbumsScreen() {
  const router = useRouter();

  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchAlbums = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      malawiLog("Fetching albums from MalawiSongs API...", "API");

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: unknown = await response.json();

      let albumList: Album[] = [];

      if (Array.isArray(result)) {
        albumList = result as Album[];
      } else if (
        result !== null &&
        typeof result === "object" &&
        "data" in result
      ) {
        const data = (result as { data: unknown }).data;

        if (Array.isArray(data)) {
          albumList = data as Album[];
        } else if (
          data !== null &&
          typeof data === "object" &&
          "albums" in data &&
          Array.isArray((data as { albums: unknown }).albums)
        ) {
          albumList = (data as { albums: Album[] }).albums;
        }
      }

      setAlbums(albumList);

      malawiLog(
        `Albums loaded successfully: ${albumList.length}`,
        "SUCCESS"
      );

      if (albumList.length === 0) {
        malawiLog(
          `No albums found. API response: ${JSON.stringify(result)}`,
          "ERROR"
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load albums";

      setError(message);
      malawiLog(`Albums API error: ${message}`, "ERROR");
      console.error("Albums API error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

 

const openAlbum = (album: Album) => {
  const albumData = album as Album & {
    id?: string | number;
    album_id?: string | number;
    albumId?: string | number;
  };

  const id =
    albumData.album_id ??
    albumData.id ??
    albumData.albumId;

  console.log("SELECTED ALBUM:", JSON.stringify(albumData, null, 2));
  console.log("ALBUM ID:", id);

  if (id === undefined || id === null || String(id).trim() === "") {
    malawiLog(
      `Album ID missing in API response: ${JSON.stringify(albumData)}`,
      "ERROR"
    );
    return;
  }

  router.push({
    pathname: "/albums/[id]",
    params: {
      id: String(id),
      album_id: String(id),
      title: String(albumData.title ?? albumData.name ?? "Album Details"),
      year: String(albumData.year ?? ""),
      image: String(
        albumData.image ??
        albumData.cover_image ??
        albumData.cover ??
        ""
      ),
    },
  });
};

  const renderAlbum = ({ item }: { item: Album }) => {
    const title = item.title || item.name || "Untitled Album";
    const imageUrl =
      item.image ?? item.cover_image ?? item.cover ?? null;

    const trackCount = item.track_count ?? item.total_tracks;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.albumCard,
          pressed && styles.pressedCard,
        ]}
        onPress={() => openAlbum(item)}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.albumImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.albumImage, styles.imagePlaceholder]}>
            <Ionicons name="musical-notes" size={42} color="#8A8A8A" />
          </View>
        )}

        <View style={styles.albumInfo}>
          <Text style={styles.albumTitle} numberOfLines={2}>
            {title}
          </Text>

          <Text style={styles.albumSubtitle}>
            {item.year ? String(item.year) : "Album"}
          </Text>

          {trackCount !== undefined && (
            <Text style={styles.trackCount}>
              {trackCount} {Number(trackCount) === 1 ? "song" : "songs"}
            </Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={22} color="#BDBDBD" />
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={styles.statusText}>Loading MalawiSongs albums...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Albums</Text>
          <Text style={styles.subheading}>
            Discover albums from Malawi
          </Text>
        </View>

        <Pressable
          style={styles.refreshButton}
          onPress={() => fetchAlbums(true)}
          accessibilityLabel="Refresh albums"
        >
          <Ionicons name="refresh" size={23} color="#1DB954" />
        </Pressable>
      </View>

      {error !== "" && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => fetchAlbums()}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {!error && albums.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="albums-outline" size={55} color="#777777" />
          <Text style={styles.emptyTitle}>No albums found</Text>
          <Text style={styles.statusText}>
            Pull down to refresh the album list.
          </Text>
        </View>
      ) : (
        <FlatList
          data={albums}
          keyExtractor={(item, index) =>
            String(
              item.album_id ??
                item.id ??
                item.albumId ??
                `${item.title ?? item.name ?? "album"}-${index}`
            )
          }
          renderItem={renderAlbum}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAlbums(true)}
              tintColor="#1DB954"
              colors={["#1DB954"]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101010",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
  },
  subheading: {
    color: "#AAAAAA",
    fontSize: 14,
    marginTop: 5,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#202020",
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: 30,
  },
  albumCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1B1B1B",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  pressedCard: {
    opacity: 0.7,
  },
  albumImage: {
    width: 76,
    height: 76,
    borderRadius: 9,
    backgroundColor: "#292929",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  albumInfo: {
    flex: 1,
    marginHorizontal: 13,
  },
  albumTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  albumSubtitle: {
    color: "#B0B0B0",
    fontSize: 13,
    marginTop: 5,
  },
  trackCount: {
    color: "#1DB954",
    fontSize: 12,
    marginTop: 5,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  statusText: {
    color: "#AAAAAA",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
  },
  errorContainer: {
    backgroundColor: "#261818",
    padding: 16,
    borderRadius: 10,
    marginBottom: 15,
  },
  errorText: {
    color: "#FF7777",
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: "#1DB954",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 12,
  },
  retryText: {
    color: "#000000",
    fontWeight: "bold",
  },
});
