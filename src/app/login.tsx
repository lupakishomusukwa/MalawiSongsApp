

import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import {
  reload,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      Alert.alert(
        "Missing information",
        "Enter your email and password."
      );
      return;
    }

    setLoading(true);
    malawiLog("Login attempt started", "INFO");

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      await reload(credential.user);

      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error(
          "The signed-in user could not be loaded."
        );
      }

      if (!currentUser.emailVerified) {
        malawiLog(
          "Email is not verified; access restricted",
          "WAIT"
        );

        router.replace("/verify-email");
        return;
      }

      malawiLog(
        "Verified user logged in successfully",
        "SUCCESS"
      );

      router.replace("/bootloader");
    } catch (error: any) {
      malawiLog(
        `Login failed: ${
          error?.code ?? error?.message ?? "Unknown error"
        }`,
        "ERROR"
      );

      const code = error?.code;
      let message = "Unable to log in. Please try again.";

      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found"
      ) {
        message = "The email or password is incorrect.";
      } else if (code === "auth/invalid-email") {
        message = "Enter a valid email address.";
      } else if (code === "auth/too-many-requests") {
        message =
          "Too many attempts. Please wait and try again later.";
      } else if (code === "auth/network-request-failed") {
        message =
          "Check your internet connection and try again.";
      } else if (
        error?.message ===
        "The signed-in user could not be loaded."
      ) {
        message =
          "We couldn't load your account. Please try again.";
      }

      Alert.alert("Login failed", message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert(
        "Enter your email",
        "Enter your email address above before requesting a password reset."
      );
      return;
    }

    setResetting(true);

    try {
      await sendPasswordResetEmail(auth, cleanEmail);

      malawiLog(
        "Password reset email requested",
        "SUCCESS"
      );

      Alert.alert(
        "Check your email",
        "If an account exists for that address, Firebase will send a password reset link."
      );
    } catch (error: any) {
      malawiLog(
        `Password reset failed: ${
          error?.code ?? error?.message ?? "Unknown error"
        }`,
        "ERROR"
      );

      const message =
        error?.code === "auth/invalid-email"
          ? "Enter a valid email address."
          : error?.code === "auth/too-many-requests"
            ? "Too many attempts. Please wait before trying again."
            : "We couldn't send the reset email. Check your connection and try again.";

      Alert.alert("Password reset", message);
    } finally {
      setResetting(false);
    }
  }

  async function handleUseAnotherAccount() {
    try {
      await signOut(auth);
      router.replace("/register");
    } catch {
      Alert.alert(
        "Error",
        "Unable to sign out. Please try again."
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* MalawiSongs brand logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="MalawiSongs logo"
            />
          </View>

          <Text style={styles.brand}>MalawiSongs</Text>

          <Text style={styles.heading}>Welcome back</Text>

          <Text style={styles.subtitle}>
            Sign in to discover the best music from Malawi.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Email address</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#8D9BB0"
              />

              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#718096"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!loading && !resetting}
                returnKeyType="next"
              />
            </View>

            <Text style={styles.label}>Password</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#8D9BB0"
              />

              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#718096"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="current-password"
                editable={!loading && !resetting}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />

              <TouchableOpacity
                onPress={() =>
                  setShowPassword((previous) => !previous)
                }
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                <Ionicons
                  name={
                    showPassword
                      ? "eye-off-outline"
                      : "eye-outline"
                  }
                  size={21}
                  color="#8D9BB0"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgotButton}
              onPress={handleForgotPassword}
              disabled={loading || resetting}
            >
              {resetting ? (
                <ActivityIndicator
                  color="#35D07F"
                  size="small"
                />
              ) : (
                <Text style={styles.forgotText}>
                  Forgot password?
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.loginButton,
                (loading || resetting) &&
                  styles.disabledButton,
              ]}
              onPress={handleLogin}
              disabled={loading || resetting}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#08111F" />
              ) : (
                <Text style={styles.loginButtonText}>
                  Sign In
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>
              Don't have an account?{" "}
            </Text>

            <Link href="/register" asChild>
              <Text style={styles.registerLink}>
                Create account
              </Text>
            </Link>
          </View>

          {auth.currentUser &&
            !auth.currentUser.emailVerified && (
              <TouchableOpacity
                style={styles.anotherAccountButton}
                onPress={handleUseAnotherAccount}
              >
                <Text style={styles.anotherAccountText}>
                  Sign out and use another account
                </Text>
              </TouchableOpacity>
            )}

          <Text style={styles.footer}>
            Your music. Your Malawi. Your sound.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: "#08111F",
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },

  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 25,
    paddingVertical: 35,
  },

  logoContainer: {
    alignSelf: "center",
    width: 140,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  logoImage: {
    width: 140,
    height: 120,
  },

  brand: {
    color: "#35D07F",
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center",
  },

  heading: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 27,
  },

  subtitle: {
    color: "#AEBBD0",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 9,
    marginBottom: 28,
  },

  form: {
    width: "100%",
  },

  label: {
    color: "#E6EDF7",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 9,
    marginTop: 14,
  },

  inputContainer: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderColor: "#26374D",
    backgroundColor: "#101C2D",
    borderRadius: 12,
    paddingHorizontal: 15,
  },

  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    paddingVertical: 13,
  },

  forgotButton: {
    alignSelf: "flex-end",
    paddingVertical: 13,
  },

  forgotText: {
    color: "#35D07F",
    fontSize: 13,
    fontWeight: "700",
  },

  loginButton: {
    height: 54,
    backgroundColor: "#35D07F",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  loginButtonText: {
    color: "#08111F",
    fontSize: 16,
    fontWeight: "900",
  },

  disabledButton: {
    opacity: 0.6,
  },

  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 26,
  },

  registerPrompt: {
    color: "#AEBBD0",
    fontSize: 14,
  },

  registerLink: {
    color: "#35D07F",
    fontSize: 14,
    fontWeight: "800",
  },

  anotherAccountButton: {
    alignSelf: "center",
    padding: 14,
  },

  anotherAccountText: {
    color: "#AEBBD0",
    fontSize: 13,
    textDecorationLine: "underline",
  },

  footer: {
    color: "#66768C",
    fontSize: 12,
    textAlign: "center",
    marginTop: 30,
  },
});
