

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";

const BOOT_DURATION = 5000;

const messages = [
  "Initializing MalawiSongs...",
  "Preparing your music experience...",
  "Getting everything ready...",
  "Welcome to MalawiSongs!",
];

export default function BootloaderScreen() {
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0)).current;

  const [messageIndex, setMessageIndex] = useState(0);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    let mounted = true;
    const startTime = Date.now();

    const spinAnimation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.timing(progress, {
      toValue: 1,
      duration: BOOT_DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    spinAnimation.start();
    pulseAnimation.start();

    const progressListener = progress.addListener(({ value }) => {
      if (mounted) {
        setPercent(Math.min(100, Math.floor(value * 100)));
      }
    });

    const messageTimer = setInterval(() => {
      if (mounted) {
        const elapsed = Date.now() - startTime;
        const index = Math.min(
          messages.length - 1,
          Math.floor((elapsed / BOOT_DURATION) * messages.length)
        );

        setMessageIndex(index);
      }
    }, 250);

    const startupTimer = setTimeout(() => {
      if (mounted) {
        router.replace("/tabs");
      }
    }, BOOT_DURATION);

    return () => {
      mounted = false;

      spinAnimation.stop();
      pulseAnimation.stop();
      progress.stopAnimation();
      progress.removeListener(progressListener);

      clearInterval(messageTimer);
      clearTimeout(startupTimer);
    };
  }, [rotation, pulse, progress]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      {/* Actual MalawiSongs logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          { transform: [{ scale: pulse }] },
        ]}
      >
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logoImage}
          resizeMode="contain"
          accessibilityLabel="MalawiSongs logo"
        />
      </Animated.View>

      <Text style={styles.brand}>MalawiSongs</Text>

      <Text style={styles.tagline}>
        Your music. Your Malawi. Your sound.
      </Text>

      {/* Animated loading indicator */}
      <View style={styles.spinner}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons
            name="sync-outline"
            size={30}
            color="#35D07F"
          />
        </Animated.View>
      </View>

      <Text style={styles.loadingTitle}>
        {messages[messageIndex]}
      </Text>

      {/* Loading progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: progressWidth },
            ]}
          />
        </View>

        <View style={styles.progressLabels}>
          <Text style={styles.progressText}>
            Loading your environment
          </Text>

          <Text style={styles.percentText}>
            {percent}%
          </Text>
        </View>
      </View>

      {/* Startup status */}
      <View style={styles.statusContainer}>
        <Ionicons
          name="checkmark-circle"
          size={19}
          color="#35D07F"
        />

        <Text style={styles.statusText}>
          Authentication successful
        </Text>
      </View>

      <View style={styles.statusContainer}>
        <Ionicons
          name="headset-outline"
          size={19}
          color="#35D07F"
        />

        <Text style={styles.statusText}>
          Preparing your music environment
        </Text>
      </View>

      <Text style={styles.footer}>
        POWERED BY MALAWISONGS
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08111F",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  logoContainer: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  logoImage: {
    width: 120,
    height: 120,
  },

  brand: {
    color: "#35D07F",
    fontSize: 34,
    fontWeight: "900",
  },

  tagline: {
    color: "#AEBBD0",
    fontSize: 13,
    marginTop: 9,
    textAlign: "center",
  },

  spinner: {
    marginTop: 35,
    marginBottom: 18,
  },

  loadingTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    minHeight: 24,
  },

  progressSection: {
    width: "100%",
    marginTop: 28,
    marginBottom: 25,
  },

  progressTrack: {
    height: 7,
    backgroundColor: "#26374D",
    borderRadius: 8,
    overflow: "hidden",
  },

  progressFill: {
    height: 7,
    backgroundColor: "#35D07F",
    borderRadius: 8,
  },

  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 9,
  },

  progressText: {
    color: "#8D9BB0",
    fontSize: 11,
  },

  percentText: {
    color: "#35D07F",
    fontSize: 12,
    fontWeight: "800",
  },

  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },

  statusText: {
    color: "#C4D0E0",
    fontSize: 13,
  },

  footer: {
    position: "absolute",
    bottom: 35,
    color: "#66768C",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
});
