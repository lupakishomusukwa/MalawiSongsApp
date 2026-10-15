

import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import {
    createUserWithEmailAndPassword,
    sendEmailVerification,
    updateProfile,
} from "firebase/auth";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { malawiLog } from "../components/MalawiSongsLog";
import { auth } from "../lib/firebase";

export default function RegisterScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername || !cleanEmail || !password || !confirmPassword) {
      Alert.alert("Missing details", "Please fill in every field.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      Alert.alert("Invalid email", "Enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Weak password",
        "Your password must contain at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      malawiLog("Creating a new user account", "WAIT");

      const credential = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      await updateProfile(credential.user, {
        displayName: cleanUsername,
      });

      await sendEmailVerification(credential.user);

      malawiLog("Verification email sent", "SUCCESS");

      router.replace("/verify-email");
    } catch (error: any) {
      malawiLog(
        `Registration failed: ${error?.code ?? error?.message ?? "Unknown error"}`,
        "ERROR"
      );

      let message = "We could not create your account. Please try again.";

      if (error?.code === "auth/email-already-in-use") {
        message = "This email already has an account. Please log in.";
      } else if (error?.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (error?.code === "auth/weak-password") {
        message = "Please choose a stronger password.";
      } else if (
        error?.code === "auth/network-request-failed"
      ) {
        message = "Check your internet connection and try again.";
      }

      Alert.alert("Registration failed", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoCircle}>
          <Ionicons name="musical-notes" size={36} color="#35D07F" />
        </View>

        <Text style={styles.brand}>MalawiSongs</Text>
        <Text style={styles.heading}>Create your account</Text>
        <Text style={styles.subtitle}>
          Join us and discover the best music from Malawi.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Username</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#8294AD" />
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              placeholderTextColor="#8294AD"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="words"
              maxLength={40}
              editable={!loading}
            />
          </View>

          <Text style={styles.label}>Email address</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#8294AD" />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#8294AD"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#8294AD" />
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor="#8294AD"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <Text style={styles.label}>Confirm password</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#8294AD" />
            <TextInput
              style={styles.input}
              placeholder="Enter your password again"
              placeholderTextColor="#8294AD"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#08111F" />
            ) : (
              <Text style={styles.buttonText}>Create account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Link href="/login" style={styles.loginLink}>
              Log in
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#08111F",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  logoCircle: {
    alignSelf: "center",
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#14283A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  brand: {
    color: "#35D07F",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 20,
  },
  subtitle: {
    color: "#AEBBD0",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 26,
  },
  form: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  label: {
    color: "#D2D9E5",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 14,
  },
  inputContainer: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#263A52",
    borderRadius: 12,
    backgroundColor: "#101D30",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    paddingVertical: 12,
  },
  button: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: "#35D07F",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
  disabledButton: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#08111F",
    fontSize: 16,
    fontWeight: "900",
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 24,
  },
  loginText: {
    color: "#AEBBD0",
    fontSize: 14,
  },
  loginLink: {
    color: "#35D07F",
    fontSize: 14,
    fontWeight: "800",
  },
});
