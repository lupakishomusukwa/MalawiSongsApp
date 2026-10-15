

import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    Image,
    Modal,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { usePlayer } from "./PlayerContext";

const GREEN = "#35D07F";

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export default function FullPlayerModal() {
  const {
    currentSong,
    buttonShowsPause,
    progress,
    shuffle,
    repeatMode,
    playerVisible,
    togglePlayButton,
    setProgress,
    toggleShuffle,
    cycleRepeat,
    closePlayer,
    showQueueNotice,
  } = usePlayer();

  const [progressBarWidth, setProgressBarWidth] = useState(1);

  const duration = currentSong?.duration ?? 0;
  const elapsed = duration * progress;

  return (
    <Modal
      visible={playerVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={closePlayer}
      statusBarTranslucent={false}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <Pressable
            onPress={closePlayer}
            style={styles.topButton}
            accessibilityRole="button"
            accessibilityLabel="Close full player"
          >
            <Ionicons
              name="chevron-down"
              size={28}
              color="#FFFFFF"
            />
          </Pressable>

          <View style={styles.topTitleArea}>
            <Text style={styles.eyebrow}>NOW PLAYING</Text>
            <Text style={styles.topTitle}>MalawiSongs</Text>
          </View>

          <View style={styles.topButton}>
            <Ionicons
              name="ellipsis-horizontal"
              size={24}
              color="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.content}>
          {currentSong?.artwork ? (
            <Image
              source={{ uri: currentSong.artwork }}
              style={styles.cover}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons
                name="musical-notes"
                size={90}
                color={GREEN}
              />
              <Text style={styles.placeholderText}>
                MalawiSongs
              </Text>
            </View>
          )}

          <View style={styles.songInfo}>
            <View style={styles.songText}>
              <Text style={styles.songTitle} numberOfLines={2}>
                {currentSong?.title ?? "Choose a song"}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {currentSong?.artist ?? "Select a song from your library"}
              </Text>
            </View>

            <Ionicons
              name="heart-outline"
              size={27}
              color="#A5AEC2"
            />
          </View>

          <View style={styles.progressSection}>
            <Pressable
              style={styles.progressTrack}
              onLayout={(event) =>
                setProgressBarWidth(
                  Math.max(1, event.nativeEvent.layout.width)
                )
              }
              onPress={(event) => {
                const nextProgress =
                  event.nativeEvent.locationX / progressBarWidth;

                setProgress(
                  Math.max(0, Math.min(1, nextProgress))
                );
              }}
              accessibilityRole="adjustable"
              accessibilityLabel="Preview song progress"
            >
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress * 100}%` },
                ]}
              />
              <View
                style={[
                  styles.progressKnob,
                  { left: `${progress * 100}%` },
                ]}
              />
            </Pressable>

            <View style={styles.timeRow}>
              <Text style={styles.timeText}>
                {formatTime(elapsed)}
              </Text>
              <Text style={styles.timeText}>
                {formatTime(duration)}
              </Text>
            </View>
          </View>

          <View style={styles.controls}>
            <Pressable
              onPress={toggleShuffle}
              style={styles.sideControl}
              accessibilityLabel="Toggle shuffle preview"
            >
              <Ionicons
                name="shuffle"
                size={24}
                color={shuffle ? GREEN : "#A5AEC2"}
              />
            </Pressable>

            <Pressable
              onPress={showQueueNotice}
              style={styles.skipButton}
              accessibilityLabel="Previous track placeholder"
            >
              <Ionicons
                name="play-skip-back"
                size={30}
                color="#FFFFFF"
              />
            </Pressable>

            <Pressable
              onPress={togglePlayButton}
              style={styles.mainPlayButton}
              accessibilityRole="button"
              accessibilityLabel="Toggle play button preview"
            >
              <Ionicons
                name={buttonShowsPause ? "pause" : "play"}
                size={35}
                color="#07120C"
              />
            </Pressable>

            <Pressable
              onPress={showQueueNotice}
              style={styles.skipButton}
              accessibilityLabel="Next track placeholder"
            >
              <Ionicons
                name="play-skip-forward"
                size={30}
                color="#FFFFFF"
              />
            </Pressable>

            <Pressable
              onPress={cycleRepeat}
              style={styles.sideControl}
              accessibilityLabel="Cycle repeat mode preview"
            >
              <Ionicons
                name="repeat"
                size={24}
                color={repeatMode !== "off" ? GREEN : "#A5AEC2"}
              />
              {repeatMode === "one" && (
                <Text style={styles.repeatOne}>1</Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.demoNotice}>
            UI PREVIEW — no audio is playing yet.
          </Text>

          <View style={styles.bottomRow}>
            <Ionicons
              name="list"
              size={22}
              color="#A5AEC2"
            />
            <Text style={styles.bottomText}>
              Queue controls will be connected with playback.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1020",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  topButton: {
    width: 40,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitleArea: {
    alignItems: "center",
  },
  eyebrow: {
    color: "#8B93A7",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  topTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 25,
    paddingBottom: 22,
  },
  cover: {
    width: "100%",
    aspectRatio: 1,
    maxHeight: 360,
    borderRadius: 18,
    backgroundColor: "#151D30",
    alignSelf: "center",
  },
  coverPlaceholder: {
    width: "100%",
    aspectRatio: 1,
    maxHeight: 360,
    alignSelf: "center",
    borderRadius: 18,
    backgroundColor: "#151D30",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 14,
  },
  songInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 28,
  },
  songText: {
    flex: 1,
    marginRight: 15,
  },
  songTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
  },
  artist: {
    color: "#A5AEC2",
    fontSize: 14,
    marginTop: 7,
  },
  progressSection: {
    marginTop: 28,
  },
  progressTrack: {
    height: 22,
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  progressFill: {
    position: "absolute",
    left: 0,
    height: 4,
    backgroundColor: GREEN,
    borderRadius: 4,
  },
  progressKnob: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GREEN,
    marginLeft: -6,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 3,
  },
  timeText: {
    color: "#8B93A7",
    fontSize: 11,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
  },
  sideControl: {
    width: 34,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  skipButton: {
    width: 42,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  mainPlayButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  repeatOne: {
    position: "absolute",
    color: GREEN,
    fontSize: 9,
    fontWeight: "900",
    top: 23,
  },
  demoNotice: {
    color: "#F0C36D",
    fontSize: 11,
    textAlign: "center",
    marginTop: 23,
    fontWeight: "600",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    gap: 9,
  },
  bottomText: {
    color: "#8B93A7",
    fontSize: 11,
  },
});
