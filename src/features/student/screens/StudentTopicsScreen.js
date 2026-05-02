import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import PrivateLayout from '../../../components/PrivateLayout';
import { getStudentCourseTopics, getStudentWiseBatchDetails, getStudentRegistrationDetails } from '../services/studentPortalApi';
import { STUDENT_NAV_ITEMS } from '../shared/studentNavItems';
import { getVideosByPlaylist } from '../../../services/videoApi';

const getValue = (...values) => values.find((value) => value !== undefined && value !== null);
const safeArray = (value) => (Array.isArray(value) ? value : []);

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCountLabel = (count, singular, plural) => {
  if (count === 1) return `1 ${singular}`;
  return `${count} ${plural}`;
};

const StudentTopicsScreen = () => {
  const navigation = useNavigation();
  const student = useSelector((state) => state.auth.student);
  const studentId = getValue(student?.StudentId, student?.studentId);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [courseInfo, setCourseInfo] = useState(null);
  const [topics, setTopics] = useState([]);
  const [videoCounts, setVideoCounts] = useState({}); // { [folderId]: number }

  const resolveRegistrationId = async () => {
    const directRegistrationId = toNumber(getValue(student?.RegistrationId, student?.registrationId));
    if (directRegistrationId > 0) {
      return [directRegistrationId];
    }

    if (!studentId) {
      return [];
    }

    try {
      const registration = await getStudentRegistrationDetails(studentId);
      if (registration?.registrationId) {
        return [toNumber(registration.registrationId)];
      }
    } catch (error) {
      console.log('Error resolving registration id:', error);
    }

    return [];
  };


  const loadFolderVideoCounts = async (topicList) => {
    const entries = await Promise.all(
      safeArray(topicList).map(async (topic) => {
        const folderId = getValue(topic?.publicFolderId, topic?.PublicFolderId);
        const key = String(folderId || '');

        if (!folderId) return [key, 0];

        try {
          const res = await getVideosByPlaylist(folderId);

          return [key, res?.totalCount || 0]; // ✅ FIXED

        } catch {
          return [key, 0];
        }
      }),
    );

    setVideoCounts(Object.fromEntries(entries));
  };

  
  const loadTopics = async (showLoader = true) => {
    if (!studentId) {
      setCourseInfo(null);
      setTopics([]);
      setLoading(false);
      return;
    }

    if (showLoader) {
      setLoading(true);
    }

    setError('');

    try {
      const registrationId = await resolveRegistrationId();
      if (!registrationId) {
        setCourseInfo(null);
        setTopics([]);
        return;
      }

      const topicResponse = await getStudentCourseTopics(registrationId);
      if (!topicResponse) {
        setCourseInfo(null);
        setTopics([]);
        return;
      }

      const mappedCourseInfo = {
        registrationId: getValue(topicResponse?.registrationId, topicResponse?.RegistrationId),
        courseName: getValue(topicResponse?.courseName, topicResponse?.CourseName, 'N/A'),
        studentName: getValue(topicResponse?.studentName, topicResponse?.StudentName, 'Student'),
      };

      const topicList = safeArray(getValue(topicResponse?.topics, topicResponse?.Topics));

      setCourseInfo(mappedCourseInfo);
      setTopics(topicList);
      void loadFolderVideoCounts(topicList);
    } catch (requestError) {
      setError('Unable to load course topics right now.');
      setCourseInfo(null);
      setTopics([]);
      setVideoCounts({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopics(true);
  }, [studentId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadTopics(false);
    } finally {
      setRefreshing(false);
    }
  };

  const topicItems = useMemo(() => {
    return safeArray(topics).map((topic, index) => {
      const publicFolderId = getValue(topic?.publicFolderId, topic?.PublicFolderId);
      const folderKey = String(publicFolderId || '');

      return {
        id: String(getValue(topic?.courseTopicId, topic?.CourseTopicId, index + 1)),
        sequence: index + 1,
        topicName: getValue(topic?.topicName, topic?.TopicName, 'N/A'),
        topicId: getValue(topic?.topicId, topic?.TopicId, 'N/A'),
        publicFolderId,
        videoCount: videoCounts[folderKey] ?? 0,
      };
    });
  }, [topics, videoCounts]);

  const stats = useMemo(() => {
    const total = topicItems.length;
    const available = topicItems.filter((t) => Boolean(t.publicFolderId)).length;
    return { total, available, pending: total - available };
  }, [topicItems]);

  if (loading) {
    return (
      <PrivateLayout title="Video Lectures" navItems={STUDENT_NAV_ITEMS}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loaderText}>Preparing your learning dashboard...</Text>
        </View>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout title="Video Lectures" navItems={STUDENT_NAV_ITEMS}>
      <View style={styles.container}>
        {!studentId ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>👤</Text>
            <Text style={styles.emptyTitle}>Student profile not available</Text>
            <Text style={styles.emptyText}>Please sign in again to load your personalized topics.</Text>
          </View>
        ) : topicItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyTitle}>No topics found</Text>
            <Text style={styles.emptyText}>Your course topics will appear here once they are mapped.</Text>
          </View>
        ) : (
          <FlatList
            data={topicItems}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <>
                {error ? (
                  <View style={styles.alertBox}>
                    <Text style={styles.alertTitle}>We couldn’t refresh everything</Text>
                    <Text style={styles.alertText}>{error}</Text>
                  </View>
                ) : null}

                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Course Overview</Text>
                  <Text style={styles.summaryTitle}>{courseInfo?.courseName || 'N/A'}</Text>

                  {/* <View style={styles.summaryMetaRow}>
                    <Text style={styles.summaryMeta}>Student</Text>
                    <Text style={styles.summaryMetaValue}>{courseInfo?.studentName || 'Student'}</Text>
                  </View> */}

                  {/* <View style={styles.summaryMetaRow}>
                    <Text style={styles.summaryMeta}>Registration ID</Text>
                    <Text style={styles.summaryMetaValue}>{courseInfo?.registrationId || 'N/A'}</Text>
                  </View> */}

                  <View style={styles.statsRow}>
                    <View style={styles.statPill}>
                      <Text style={styles.statValue}>{stats.total}</Text>
                      <Text style={styles.statLabel}>Total Topics</Text>
                    </View>
                    <View style={[styles.statPill, styles.statPillSuccess]}>
                      <Text style={[styles.statValue, styles.statValueSuccess]}>{stats.available}</Text>
                      <Text style={[styles.statLabel, styles.statLabelSuccess]}>Ready</Text>
                    </View>
                    <View style={[styles.statPill, styles.statPillMuted]}>
                      <Text style={[styles.statValue, styles.statValueMuted]}>{stats.pending}</Text>
                      <Text style={[styles.statLabel, styles.statLabelMuted]}>Pending</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Course Topics</Text>
                  <View style={styles.sectionPill}>
                    <Text style={styles.sectionPillText}>{formatCountLabel(topicItems.length, 'Topic', 'Topics')}</Text>
                  </View>
                </View>
              </>
            }
            renderItem={({ item }) => {
              const isAvailable = Boolean(item.publicFolderId);

              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={!isAvailable}
                  style={[styles.card, !isAvailable ? styles.cardDisabled : null]}
                  onPress={() =>
                    navigation.navigate('CoursePlayer', {
                      folderId: item.publicFolderId,
                      courseName: courseInfo?.courseName || item.topicName,
                      topicName: item.topicName,
                    })
                  }
                >
                  <View style={[styles.topAccent, isAvailable ? styles.topAccentReady : styles.topAccentPending]} />

                  <View style={styles.cardHeader}>
                    <View style={styles.indexPill}>
                      <Text style={styles.indexPillText}>{item.sequence}</Text>
                    </View>
                    <View style={styles.titleWrap}>
                      <Text style={styles.title} numberOfLines={2}>
                        {item.topicName}
                      </Text>
                      <Text style={styles.subtitle}>{formatCountLabel(item.videoCount, 'video', 'videos')}</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Resources</Text>
                    <View
                      style={[
                        styles.resourcePill,
                        isAvailable ? styles.resourceReady : styles.resourcePending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.resourceText,
                          isAvailable ? styles.resourceTextReady : styles.resourceTextPending,
                        ]}
                      >
                        {isAvailable ? 'Available' : 'Not Available'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.footerRow}>
                    <Text style={[styles.ctaText, !isAvailable ? styles.ctaTextDisabled : null]}>
                      {isAvailable ? 'Open player' : 'Content will be added soon'}
                    </Text>
                    <Text style={styles.topicCode}>Topic ID: {item.topicId}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </PrivateLayout>
  );
};

export default StudentTopicsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loaderText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },

  summaryCard: {
    backgroundColor: '#F8FAFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    padding: 16,
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  summaryTitle: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  summaryMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryMeta: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryMetaValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },

  statsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  statPillSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#BBF7D0',
  },
  statPillMuted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  statValueSuccess: {
    color: '#166534',
  },
  statLabelSuccess: {
    color: '#166534',
  },
  statValueMuted: {
    color: '#334155',
  },
  statLabelMuted: {
    color: '#64748B',
  },
  sectionRow: {
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '800',
  },
  sectionPill: {
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sectionPillText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '800',
  },

  alertBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDBA74',
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9A3412',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 13,
    color: '#C2410C',
  },

  emptyState: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 26,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 13,
    maxWidth: 280,
    lineHeight: 19,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.84,
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  topAccentReady: {
    backgroundColor: '#2563EB',
  },
  topAccentPending: {
    backgroundColor: '#CBD5E1',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  indexPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EAF1FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  indexPillText: {
    color: '#1D4ED8',
    fontWeight: '800',
    fontSize: 12,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '700',
    lineHeight: 20,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  chevron: {
    marginLeft: 8,
    fontSize: 24,
    lineHeight: 22,
    color: '#94A3B8',
    fontWeight: '400',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  resourcePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  resourceReady: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  resourcePending: {
    backgroundColor: '#EEF2F7',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  resourceText: {
    fontSize: 11,
    fontWeight: '800',
  },
  resourceTextReady: {
    color: '#166534',
  },
  resourceTextPending: {
    color: '#475569',
  },
  divider: {
    marginTop: 10,
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  footerRow: {
    marginTop: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  ctaTextDisabled: {
    color: '#64748B',
  },
  topicCode: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
  },
});
