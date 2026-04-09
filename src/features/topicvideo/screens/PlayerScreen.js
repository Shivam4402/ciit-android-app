import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
} from "react-native";
import { WebView } from "react-native-webview";
import Toast from "react-native-toast-message";
import { getVideosByFolder } from "../services/videoApi";

const COLORS = {
  primary: "#4A90E2",
  background: "#F7F9FC",
  card: "#FFFFFF",
  text: "#222",
  subtext: "#666",
  border: "#E6E6E6",
};

const PlayerScreen = ({ route }) => {
  const { folderId, courseName } = route.params;

  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const flatListRef = useRef();

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getVideosByFolder(folderId);

      setVideos(data);

      if (data.length > 0) {
        setSelectedVideo(data[0]);
      } else {
        Toast.show({
          type: "info",
          text1: "No Videos",
          text2: "No videos available",
        });
      }
    } catch (err) {
      setError(err.message);

      Toast.show({
        type: "error",
        text1: "Error",
        text2: err.message || "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  const getVideoHtml = (videoId) => `
    <html>
      <body style="margin:0;padding:0;background:black;">
        <iframe 
          src="https://player.vimeo.com/video/${videoId}?autoplay=1"
          width="100%" height="100%" frameborder="0"
          allow="autoplay; fullscreen">
        </iframe>
      </body>
    </html>
  `;

  const handleSelectVideo = (item, index) => {
    setSelectedVideo(item);

    // auto scroll to selected
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.3,
    });
  };

  // ---------------- STATES ----------------

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Something went wrong</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchVideos}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!videos.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No videos available</Text>
      </View>
    );
  }

  // ---------------- UI ----------------

  return (
    <View style={styles.container}>
      {/* 🎬 Player */}
      <View style={styles.playerContainer}>
        {selectedVideo && (
          <WebView
            source={{ html: getVideoHtml(selectedVideo.videoId) }}
            style={styles.webview}
            javaScriptEnabled
            allowsFullscreenVideo
          />
        )}
      </View>

      {/* 🎥 Video Title */}
      <View style={styles.videoMeta}>
        <Text style={styles.videoTitleMain} numberOfLines={2}>
          {selectedVideo?.title}
        </Text>
      </View>

      {/* 📚 Section Header */}
      <Text style={styles.sectionHeader}>Course Content</Text>

      {/* 📃 Playlist */}
      <FlatList
        ref={flatListRef}
        data={videos}
        keyExtractor={(item) => item.videoId}
        contentContainerStyle={{ paddingBottom: 20 }}
        initialNumToRender={5}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const isActive = selectedVideo?.videoId === item.videoId;

          return (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.videoItem,
                isActive && styles.activeVideo,
              ]}
              onPress={() => handleSelectVideo(item, index)}
            >
              <Image
                source={{ uri: item.thumbnail }}
                style={styles.thumbnail}
              />

              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.videoTitle} numberOfLines={2}>
                  {item.title}
                </Text>

                <Text style={styles.duration}>
                  {Math.floor(item.duration / 60)} min
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

export default PlayerScreen;

// ---------------- STYLES ----------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  playerContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
  },

  webview: {
    flex: 1,
  },

  videoMeta: {
    padding: 12,
    backgroundColor: COLORS.card,
  },

  videoTitleMain: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },

  sectionHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.subtext,
    marginTop: 10,
    marginBottom: 5,
    marginLeft: 12,
  },

  videoItem: {
    flexDirection: "row",
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 10,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  activeVideo: {
    borderColor: COLORS.primary,
    backgroundColor: "#eef6ff",
  },

  thumbnail: {
    width: 120,
    height: 70,
    borderRadius: 8,
  },

  videoTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
  },

  duration: {
    fontSize: 12,
    color: COLORS.subtext,
    marginTop: 6,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  errorText: {
    fontSize: 16,
    color: "red",
    marginBottom: 10,
  },

  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },

  retryText: {
    color: "#fff",
    fontWeight: "600",
  },

  emptyText: {
    fontSize: 15,
    color: COLORS.subtext,
  },
});