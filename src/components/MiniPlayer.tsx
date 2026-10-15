
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { usePlayer } from "./PlayerContext";

const GREEN = "#35D07F";

export default function MiniPlayer() {
  const {
    currentSong,
    buttonShowsPause,
    togglePlayButton,
    openPlayer,
  } = usePlayer();

  if (!currentSong) return null;

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.songArea}
        onPress={openPlayer}
        accessibilityRole="button"
        accessibilityLabel="Open full music player"
      >
        {currentSong.artwork ? (
          <Image
            source={{ uri: currentSong.artwork }}
            style={styles.artwork}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.artworkPlaceholder}>
            <Ionicons
              name="musical-notes"
              size={23}
              color={GREEN}
            />
          </View>
        )}

        <View style={styles.songDetails}>
          <Text style={styles.title} numberOfLines={1}>
            {currentSong.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {currentSong.artist}
          </Text>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          buttonShowsPause ? "Pause preview" : "Play preview"
        }
        style={styles.playButton}
        onPress={togglePlayButton}
      >
        <Ionicons
          name={buttonShowsPause ? "pause" : "play"}
          size={25}
          color="#FFFFFF"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 69,
    height: 64,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18243A",
    borderColor: "#30405C",
    borderWidth: 1,
    borderRadius: 13,
    zIndex: 20,
    elevation: 8,
  },
  songArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#263650",
  },
  artworkPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#263650",
    alignItems: "center",
    justifyContent: "center",
  },
  songDetails: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  artist: {
    color: "#AAB5C8",
    fontSize: 11,
    marginTop: 4,
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
});
