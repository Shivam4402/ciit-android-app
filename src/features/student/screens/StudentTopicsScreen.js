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
import { getStudentCourseTopics, getStudentWiseBatchDetails } from '../services/studentPortalApi';
import { STUDENT_NAV_ITEMS } from '../shared/studentNavItems';

const getValue = (...values) => values.find((value) => value !== undefined && value !== null);
const safeArray = (value) => (Array.isArray(value) ? value : []);

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

  const resolveRegistrationId = async () => {
    const directRegistrationId = toNumber(getValue(student?.RegistrationId, student?.registrationId));
    if (directRegistrationId > 0) {
      return directRegistrationId;
    }

    if (!studentId) {
      return 0;
    }

    const batches = safeArray(await getStudentWiseBatchDetails(studentId));
    const firstRegistrationId = toNumber(
      getValue(
        batches[0]?.registrationId,
        batches[0]?.RegistrationId,
      ),
    );

    return firstRegistrationId;
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
    } catch (requestError) {
      setError('Unable to load course topics right now.');
      setCourseInfo(null);
      setTopics([]);
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
    return safeArray(topics).map((topic, index) => ({
      id: String(getValue(topic?.courseTopicId, topic?.CourseTopicId, index + 1)),
      sequence: index + 1,
      topicName: getValue(topic?.topicName, topic?.TopicName, 'N/A'),
      topicId: getValue(topic?.topicId, topic?.TopicId, 'N/A'),
      publicFolderId: getValue(topic?.publicFolderId, topic?.PublicFolderId),
    }));
  }, [topics]);

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
          <Text style={styles.loaderText}>Fetching your course topics...</Text>
        </View>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout title="Video Lectures" navItems={STUDENT_NAV_ITEMS}>
      <View style={styles.container}>
        {error ? (
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>We ran into a problem</Text>
            <Text style={styles.alertText}>{error}</Text>
          </View>
        ) : null}

        {!studentId ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Student profile not available</Text>
            <Text style={styles.emptyText}>Please sign in again to load your topics.</Text>
          </View>
        ) : topicItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No topics found</Text>
            <Text style={styles.emptyText}>Course topics will appear here once mapped.</Text>
          </View>
        ) : (
          <FlatList
            data={topicItems}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Course</Text>
                <Text style={styles.summaryTitle}>{courseInfo?.courseName || 'N/A'}</Text>
                <Text style={styles.summaryMeta}>Student: {courseInfo?.studentName || 'Student'}</Text>
                <Text style={styles.summaryMeta}>Registration ID: {courseInfo?.registrationId || 'N/A'}</Text>

                {/* <View style={styles.statsRow}>
                  <View style={styles.statPill}>
                    <Text style={styles.statValue}>{stats.total}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                  <View style={[styles.statPill, styles.statPillSuccess]}>
                    <Text style={[styles.statValue, styles.statValueSuccess]}>{stats.available}</Text>
                    <Text style={[styles.statLabel, styles.statLabelSuccess]}>Available</Text>
                  </View>
                  <View style={[styles.statPill, styles.statPillMuted]}>
                    <Text style={[styles.statValue, styles.statValueMuted]}>{stats.pending}</Text>
                    <Text style={[styles.statLabel, styles.statLabelMuted]}>Pending</Text>
                  </View>
                </View> */}
              </View>
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
                  <View style={styles.cardHeader}>
                    <View style={styles.indexPill}>
                      <Text style={styles.indexPillText}>{item.sequence}</Text>
                    </View>
                    <View style={styles.titleWrap}>
                      <Text style={styles.title} numberOfLines={2}>
                        {item.topicName}
                      </Text>
                      <Text style={styles.subtitle}>Topic #{item.topicId}</Text>
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

                  <Text style={[styles.ctaText, !isAvailable ? styles.ctaTextDisabled : null]}>
                    {isAvailable ? 'Open player' : 'Content will be added soon'}
                  </Text>
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
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loaderText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },

  summaryCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    padding: 14,
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  summaryTitle: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  summaryMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },

  statsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
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
    fontSize: 15,
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

  alertBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 13,
    color: '#B91C1C',
  },

  emptyState: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 14,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardDisabled: {
    opacity: 0.72,
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
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
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
    fontWeight: '800',
    lineHeight: 20,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 8,
    fontSize: 22,
    lineHeight: 22,
    color: '#94A3B8',
    fontWeight: '700',
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
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  resourceReady: {
    backgroundColor: '#DCFCE7',
  },
  resourcePending: {
    backgroundColor: '#E2E8F0',
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
  ctaText: {
    marginTop: 9,
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  ctaTextDisabled: {
    color: '#64748B',
  },
});
