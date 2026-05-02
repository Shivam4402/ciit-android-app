import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import YoutubePlayer from "react-native-youtube-iframe";
import Toast from 'react-native-toast-message';
import { getVideosByPlaylist } from '../services/videoApi';

const COLORS = {
  primary: '#1D4ED8',
  primarySoft: '#DBEAFE',
  success: '#16A34A',
  bg: '#F1F5F9',
  card: '#FFFFFF',
  text: '#0F172A',
  subtext: '#64748B',
  border: '#E2E8F0',
  danger: '#DC2626',
};

const toMinutesLabel = (seconds) => {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return '0 min';
  return `${Math.max(1, Math.round(value / 60))} min`;
};

const PlayerScreen = ({ route }) => {
  const playlistId = route?.params?.folderId;
  const courseName = route?.params?.courseName || 'Course';
  const topicName = route?.params?.topicName || 'Topic';

  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const flatListRef = useRef(null);
  const [nextToken, setNextToken] = useState(null);

  const loadMoreVideos = async () => {
  if (!nextToken || loadingMore) return;

  try {
    setLoadingMore(true);

    const res = await getVideosByPlaylist(playlistId, nextToken);

    setVideos(prev => [...prev, ...res.videos]);  
    setNextToken(res.nextPageToken);              

  } catch (err) {
    console.log("Load more error:", err);
  } finally {
    setLoadingMore(false);
  }
};

  const fetchVideos = useCallback(async () => {
    if (!playlistId) {
      setVideos([]);
      setSelectedVideo(null);
      setError('Playlist not found for this topic.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await getVideosByPlaylist(playlistId);

      setVideos(res.videos);
      setSelectedVideo(res.videos[0] || null);
      setNextToken(res.nextPageToken);;
      setTotalCount(res.totalCount);


      if (!res.videos || res.videos.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'No Videos',
          text2: 'No videos available for this topic',
        });
      }
    } catch (err) {
      const message = err?.message || 'Something went wrong';
      setError(message);

      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: message,
      });
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);


  const handleSelectVideo = useCallback((item, index) => {
    setSelectedVideo(item);
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.35,
    });
  }, []);

  const nowPlayingSubtitle = useMemo(() => {
    if (!selectedVideo) return '';
    return ` • ${totalCount} videos`;
  }, [selectedVideo, totalCount]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.stateText}>Loading videos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <View style={styles.stateCard}>
          <Text style={styles.errorTitle}>Unable to load videos</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchVideos} activeOpacity={0.85}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!videos.length) {
    return (
      <View style={styles.center}>
        <View style={styles.stateCard}>
          <Text style={styles.emptyTitle}>No videos available</Text>
          <Text style={styles.emptyMessage}>This topic does not have content yet.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.playerShell}>
        <View style={styles.playerContainer}>
          {selectedVideo ? (
            <YoutubePlayer
              height={220}
              play={true}
              videoId={selectedVideo?.videoId}
              onChangeState={(state) => {
                console.log("Player State:", state);
              }}
            />
          ) : null}
        </View>

        <View style={styles.metaBox}>
          <Text style={styles.courseText} numberOfLines={1}>
            {courseName}
          </Text>
          <Text style={styles.topicText} numberOfLines={1}>
            {topicName}
          </Text>
          <Text style={styles.videoTitleMain} numberOfLines={2}>
            {selectedVideo?.title || 'Now Playing'}
          </Text>
          <Text style={styles.videoSubMeta}>{nowPlayingSubtitle}</Text>
        </View>
      </View>

      <View style={styles.listHeaderRow}>
        <Text style={styles.sectionHeader}>Course Content</Text>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{totalCount}</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={videos}
        keyExtractor={(item, index) => String(item?.videoId ?? index)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}

        onEndReached={loadMoreVideos}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator size="small" /> : null
        }
        renderItem={({ item, index }) => {
          const isActive = selectedVideo?.videoId === item?.videoId;

          return (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.videoItem, isActive && styles.activeVideo]}
              onPress={() => handleSelectVideo(item, index)}
            >
              <View style={[styles.activeLine, isActive && styles.activeLineOn]} />

              {item?.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
              ) : (
                <View style={[styles.thumbnail, styles.thumbnailFallback]}>
                  <Text style={styles.thumbnailFallbackText}>No Image</Text>
                </View>
              )}

              <View style={styles.videoTextWrap}>
                <Text style={styles.videoTitle} numberOfLines={2}>
                  {item?.title || 'Untitled video'}
                </Text>
                <Text style={styles.duration}>
                  Video
                </Text>
              </View>

              {isActive ? (
                <View style={styles.nowPlayingPill}>
                  <Text style={styles.nowPlayingPillText}>Playing</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

export default PlayerScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  playerShell: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  playerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
  },

  webview: {
    flex: 1,
  },

  metaBox: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  courseText: {
    fontSize: 12,
    color: COLORS.subtext,
    fontWeight: '600',
  },

  topicText: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },

  videoTitleMain: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 22,
  },

  videoSubMeta: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.subtext,
    fontWeight: '600',
  },

  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
    marginHorizontal: 12,
  },

  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },

  countPill: {
    minWidth: 26,
    paddingHorizontal: 8,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },

  countPillText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  listContent: {
    paddingBottom: 20,
  },

  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  activeVideo: {
    borderColor: COLORS.primary,
    backgroundColor: '#EFF6FF',
  },

  activeLine: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 4,
    backgroundColor: 'transparent',
    marginRight: 10,
  },

  activeLineOn: {
    backgroundColor: COLORS.primary,
  },

  thumbnail: {
    width: 108,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },

  thumbnailFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  thumbnailFallbackText: {
    fontSize: 11,
    color: COLORS.subtext,
    fontWeight: '600',
  },

  videoTextWrap: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },

  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 19,
  },

  duration: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.subtext,
  },

  nowPlayingPill: {
    height: 24,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
  },

  nowPlayingPillText: {
    color: COLORS.success,
    fontWeight: '700',
    fontSize: 11,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: COLORS.bg,
  },

  stateText: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.subtext,
    fontWeight: '600',
  },

  stateCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: 16,
    alignItems: 'center',
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },

  errorMessage: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.subtext,
    textAlign: 'center',
  },

  retryBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },

  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },

  emptyMessage: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.subtext,
    textAlign: 'center',
  },
});