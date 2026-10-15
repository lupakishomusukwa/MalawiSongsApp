

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
    reload,
    sendEmailVerification,
    signOut,
} from "firebase/auth";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { malawiLog } from "../components/MalawiSongsLog";
import { auth } from "../lib/firebase";

export default function VerifyEmailScreen() {
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  async function checkVerification() {
    const user = auth.currentUser;

    if (!user) {
      router.replace("/login");
      return;
    }

    setChecking(true);

    try {
      await reload(user);

      if (auth.currentUser?.emailVerified) {
        malawiLog("Email successfully verified", "SUCCESS");
        Alert.alert(
          "Email verified",
          "Your email is verified. You can now access MalawiSongs.",
          [
            {
              text: "Continue",
              onPress: () => router.replace("/tabs"),
            },
          ]
        );
      } else {
        Alert.alert(
          "Not verified yet",
          "Open the verification link in your email, then try again."
        );
      }
    } catch (error: any) {
      malawiLog(
        `Verification check failed: ${error?.code ?? error?.message ?? "Unknown error"}`,
        "ERROR"
      );
      Alert.alert(
        "Unable to check",
        "Please check your internet connection and try again."
      );
    } finally {
      setChecking(false);
    }
  }

  async function resendVerification() {
    const user = auth.currentUser;

    if (!user) {
      router.replace("/login");
      return;
    }

    setResending(true);

    try {
      await sendEmailVerification(user);
      malawiLog("Verification email resent", "SUCCESS");
      Alert.alert(
        "Email sent",
        `A new verification email has been sent to ${user.email ?? "your email address"}.`
      );
    } catch (error: any) {
      malawiLog(
        `Resending verification failed: ${error?.code ?? error?.message ?? "Unknown error"}`,
        "ERROR"
      );

      const message =
        error?.code === "auth/too-many-requests"
          ? "Too many attempts. Please wait before requesting another email."
          : "We couldn't send the email. Check your connection and try again.";

      Alert.alert("Unable to send email", message);
    } finally {
      setResending(false);
    }
  }

  function returnToLogin() {
    Alert.alert(
      "Return to login?",
      "You will be signed out of this unverified account on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace("/login");
            } catch {
              Alert.alert("Error", "Unable to sign out. Please try again.");
            }
          },
        },
      ]
    );
  }

  const email = auth.currentUser?.email ?? "your email address";

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="mail-unread-outline" size={48} color="#35D07F" />
      </View>

      <Text style={styles.brand}>MalawiSongs</Text>
      <Text style={styles.heading}>Verify your email</Text>

      <Text style={styles.description}>
        We've sent a verification link to:
      </Text>
      <Text style={styles.email}>{email}</Text>

      <Text style={styles.instructions}>
        Open the email and tap its verification link. Then return here and
        check your verification status before entering the app.
      </Text>

      <TouchableOpacity
        style={[styles.primaryButton, checking && styles.disabledButton]}
        onPress={checkVerification}
        disabled={checking || resending}
        accessibilityRole="button"
      >
        {checking ? (
          <ActivityIndicator color="#08111F" />
        ) : (
          <Text style={styles.primaryButtonText}>I've verified my email</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, resending && styles.disabledButton]}
        onPress={resendVerification}
        disabled={checking || resending}
        accessibilityRole="button"
      >
        {resending ? (
          <ActivityIndicator color="#35D07F" />
        ) : (
          <Text style={styles.secondaryButtonText}>Resend verification email</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.loginButton}
        onPress={returnToLogin}
        disabled={checking || resending}
        accessibilityRole="button"
      >
        <Text style={styles.loginText}>Return to login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08111F",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#14283A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  brand: {
    color: "#35D07F",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 24,
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    color: "#AEBBD0",
    fontSize: 15,
    textAlign: "center",
  },
  email: {
    color: "#35D07F",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 18,
  },
  instructions: {
    color: "#AEBBD0",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 28,
  },
  primaryButton: {
    width: "100%",
    minHeight: 52,
    backgroundColor: "#35D07F",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: "#08111F",
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryButton: {
    width: "100%",
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#35D07F",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 14,
  },
  secondaryButtonText: {
    color: "#35D07F",
    fontSize: 14,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButton: {
    padding: 16,
    marginTop: 8,
  },
  loginText: {
    color: "#AEBBD0",
    fontSize: 14,
    fontWeight: "700",
  },
});
