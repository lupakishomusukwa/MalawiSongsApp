

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
    Alert,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSharedAudio } from "../../context/AudioPlayerContext";

export default function PlayerScreen() {
  const {
    player,
    playerStatus,
    activeSongId,
    queue,
    playNext,
    playPrevious,
    togglePlayback,
    stopPlayer,
  } = useSharedAudio();

  const currentTrack = queue.find(
    (track) => track.songId === activeSongId
  );

  const closePlayer = () => {
    stopPlayer();
    router.back();
  };

  if (!currentTrack) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <Ionicons
          name="musical-notes"
          size={70}
          color="#999999"
        />

        <Text style={styles.emptyTitle}>No song selected</Text>
        <Text style={styles.emptyText}>
          Select a song from Search to start listening.
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPlaying = playerStatus.playing;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name="chevron-down"
            size={30}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>NOW PLAYING</Text>

        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              "Close player",
              "Stop the current song and close the player?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Close",
                  style: "destructive",
                  onPress: closePlayer,
                },
              ]
            )
          }
        >
          <Ionicons name="close" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.artworkContainer}>
        {currentTrack.image ? (
          <Image
            source={{ uri: currentTrack.image }}
            style={styles.artwork}
          />
        ) : (
          <View style={styles.placeholderArtwork}>
            <Ionicons
              name="musical-notes"
              size={100}
              color="#FFFFFF"
            />
          </View>
        )}
      </View>

      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={2}>
          {currentTrack.title}
        </Text>

        <Text style={styles.artistName} numberOfLines={1}>
          {currentTrack.artist}
        </Text>
      </View>

      <View style={styles.progressPlaceholder}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width:
                  playerStatus.duration > 0
                    ? `${Math.min(
                        100,
                        (playerStatus.currentTime /
                          playerStatus.duration) *
                          100
                      )}%`
                    : "0%",
              },
            ]}
          />
        </View>

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>
            {formatTime(playerStatus.currentTime)}
          </Text>
          <Text style={styles.timeText}>
            {formatTime(playerStatus.duration)}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={playPrevious}
          accessibilityLabel="Previous song"
        >
          <Ionicons
            name="play-skip-back"
            size={38}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playButton}
          onPress={togglePlayback}
          accessibilityLabel={isPlaying ? "Pause song" : "Play song"}
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={38}
            color="#111111"
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={playNext}
          accessibilityLabel="Next song"
        >
          <Ionicons
            name="play-skip-forward"
            size={38}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.queueInfo}>
        {queue.length > 0
          ? `Song ${queue.findIndex(
              (track) => track.songId === activeSongId
            ) + 1} of ${queue.length}`
          : "Now playing"}
      </Text>
    </View>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingHorizontal: 24,
    paddingTop: 55,
    paddingBottom: 35,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
  },
  closeButton: {
    position: "absolute",
    top: 55,
    right: 24,
  },
  artworkContainer: {
    alignItems: "center",
    marginTop: 45,
  },
  artwork: {
    width: 280,
    height: 280,
    borderRadius: 16,
  },
  placeholderArtwork: {
    width: 280,
    height: 280,
    borderRadius: 16,
    backgroundColor: "#292929",
    justifyContent: "center",
    alignItems: "center",
  },
  songInfo: {
    marginTop: 35,
  },
  songTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "700",
  },
  artistName: {
    color: "#BBBBBB",
    fontSize: 16,
    marginTop: 8,
  },
  progressPlaceholder: {
    marginTop: 30,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "#444444",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: "#1DB954",
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  timeText: {
    color: "#AAAAAA",
    fontSize: 12,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    marginTop: 35,
  },
  playButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#1DB954",
    justifyContent: "center",
    alignItems: "center",
  },
  queueInfo: {
    color: "#AAAAAA",
    textAlign: "center",
    marginTop: 25,
    fontSize: 13,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 25,
  },
  emptyText: {
    color: "#BBBBBB",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },
  backButton: {
    backgroundColor: "#1DB954",
    paddingHorizontal: 25,
    paddingVertical: 13,
    borderRadius: 25,
    marginTop: 25,
  },
  backButtonText: {
    color: "#111111",
    fontWeight: "700",
  },
});
