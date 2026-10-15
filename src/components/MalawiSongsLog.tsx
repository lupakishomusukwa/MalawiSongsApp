

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

type LogType = "INFO" | "API" | "WAIT" | "SUCCESS" | "ERROR";

type LogEntry = {
  id: number;
  time: string;
  type: LogType;
  message: string;
};

type LoggerListener = (entry: LogEntry) => void;

let nextLogId = 1;
const listeners = new Set<LoggerListener>();
const recentLogs: LogEntry[] = [];
const MAX_LOGS = 40;

function notifyListeners(entry: LogEntry) {
  listeners.forEach((listener) => listener(entry));
}

export function malawiLog(
  message: string,
  type: LogType = "INFO"
) {
  const entry: LogEntry = {
    id: nextLogId++,
    time: new Date().toLocaleTimeString(),
    type,
    message,
  };

  recentLogs.push(entry);

  if (recentLogs.length > MAX_LOGS) {
    recentLogs.shift();
  }

  notifyListeners(entry);

  if (type === "ERROR") {
    console.error(`[MalawiSongs] ${message}`);
  } else {
    console.log(`[MalawiSongs:${type}] ${message}`);
  }
}

export function clearMalawiLogs() {
  recentLogs.length = 0;

  const entry: LogEntry = {
    id: nextLogId++,
    time: new Date().toLocaleTimeString(),
    type: "INFO",
    message: "Log cleared",
  };

  recentLogs.push(entry);
  notifyListeners(entry);
}

export default function MalawiSongsLog() {
  const [logs, setLogs] = useState<LogEntry[]>([...recentLogs]);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    // Show a startup message when the panel is first initialized.
    if (recentLogs.length === 0) {
      malawiLog("MalawiSongs log panel initialized", "SUCCESS");
    }

    const listener: LoggerListener = () => {
      setLogs([...recentLogs]);
    };

    listeners.add(listener);
    setLogs([...recentLogs]);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const getTypeColor = (type: LogType) => {
    switch (type) {
      case "SUCCESS":
        return "#35D07F";
      case "ERROR":
        return "#FF5C68";
      case "API":
        return "#55B8FF";
      case "WAIT":
        return "#FFC857";
      default:
        return "#D2D9E5";
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.header}
        onPress={() => setExpanded((previous) => !previous)}
        accessibilityRole="button"
        accessibilityLabel="Toggle MalawiSongs live log"
      >
        <View style={styles.headerLeft}>
          <View style={styles.liveDot} />
          <Text style={styles.headerTitle}>MalawiSongs</Text>
          <Text style={styles.headerSubtitle}>LIVE LOG</Text>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.counter}>{logs.length}</Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color="#FFFFFF"
          />
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          <View style={styles.toolbar}>
            <Text style={styles.toolbarText}>APP ACTIVITY</Text>

            <Pressable
              onPress={clearMalawiLogs}
              style={styles.clearButton}
              accessibilityRole="button"
            >
              <Ionicons
                name="trash-outline"
                size={14}
                color="#AEBBD0"
              />
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.logList}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {logs.length === 0 ? (
              <Text style={styles.emptyText}>
                Waiting for app events...
              </Text>
            ) : (
              logs
                .slice()
                .reverse()
                .map((entry) => (
                  <View key={entry.id} style={styles.logRow}>
                    <Text style={styles.time}>{entry.time}</Text>

                    <Text
                      style={[
                        styles.type,
                        { color: getTypeColor(entry.type) },
                      ]}
                    >
                      {entry.type}
                    </Text>

                    <Text style={styles.message}>
                      {entry.message}
                    </Text>
                  </View>
                ))
            )}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.footerDot} />
            <Text style={styles.footerText}>
              Monitoring app activity
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#07111F",
    borderWidth: 1,
    borderColor: "#23344B",
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 8,
    overflow: "hidden",
  },
  header: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#101D30",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#35D07F",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#35D07F",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  counter: {
    color: "#AEBBD0",
    fontSize: 11,
    fontWeight: "700",
  },
  body: {
    paddingHorizontal: 10,
    paddingTop: 6,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 6,
  },
  toolbarText: {
    color: "#8294AD",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 4,
  },
  clearText: {
    color: "#AEBBD0",
    fontSize: 10,
  },
  logList: {
    maxHeight: 170,
  },
  logRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1C2B3F",
    gap: 7,
  },
  time: {
    width: 67,
    color: "#8294AD",
    fontSize: 9,
  },
  type: {
    width: 48,
    fontSize: 9,
    fontWeight: "800",
  },
  message: {
    flex: 1,
    color: "#D2D9E5",
    fontSize: 10,
    lineHeight: 15,
  },
  emptyText: {
    color: "#8294AD",
    fontSize: 11,
    paddingVertical: 14,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#35D07F",
  },
  footerText: {
    color: "#8294AD",
    fontSize: 9,
  },
});
