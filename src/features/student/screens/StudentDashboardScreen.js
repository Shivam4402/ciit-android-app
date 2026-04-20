  import React, { useEffect, useMemo, useRef, useState } from 'react';
  import {
    ActivityIndicator,
    Animated,
    Easing,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
  } from 'react-native';
  import MaterialIcons from '@react-native-vector-icons/material-icons';
  import { useSelector } from 'react-redux';
  import { useNavigation } from '@react-navigation/native';
  import PrivateLayout from '../../../components/PrivateLayout';
  import { getStudentBatchExams, getStudentWiseBatchDetails } from '../services/studentPortalApi';
  import { STUDENT_NAV_ITEMS } from '../shared/studentNavItems';

  const getValue = (...values) => values.find((value) => value !== undefined && value !== null);
  const safeArray = (value) => (Array.isArray(value) ? value : []);

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return 'N/A';
    }

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }

    return date.toLocaleDateString();
  };

  const QUICK_LINKS = [
    { label: 'My Courses', routeName: 'StudentFeeDetails', icon: 'menu-book', color: '#2563EB' },
    { label: 'My Batches', routeName: 'StudentBatches', icon: 'groups', color: '#0EA5E9' },
    { label: 'Video Lectures', routeName: 'StudentTopics', icon: 'smart-display', color: '#7C3AED' },
    { label: 'My Exams', routeName: 'StudentExams', icon: 'fact-check', color: '#F59E0B' },
  ];

  const StudentDashboardScreen = () => {
    const navigation = useNavigation();
    const student = useSelector((state) => state.auth.student);
    const studentId = getValue(student?.StudentId, student?.studentId);

    const studentName = `${student?.StudentName || student?.studentName || 'Student'} ${student?.LastName || student?.lastName || ''}`.trim();
    const enrollmentId = getValue(
      student?.PermanentIdentificationNumber,
      student?.permanentIdentificationNumber,
      'N/A',
    );

    const tickerAnim = useRef(new Animated.Value(0)).current;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [dashboardError, setDashboardError] = useState('');
    const [exams, setExams] = useState([]);

    const resolveRegistrationIds = async () => {
      const directRegistrationId = toNumber(getValue(student?.RegistrationId, student?.registrationId));
      if (directRegistrationId > 0) {
        return [directRegistrationId];
      }

      if (!studentId) {
        return [];
      }

      const batches = safeArray(await getStudentWiseBatchDetails(studentId));
      const ids = batches
        .map((batch) => toNumber(getValue(batch?.registrationId, batch?.RegistrationId)))
        .filter((id) => id > 0);

      return Array.from(new Set(ids));
    };

    const loadDashboard = async (showLoader = true) => {
      if (!studentId) {
        setExams([]);
        setLoading(false);
        return;
      }

      if (showLoader) {
        setLoading(true);
      }

      setDashboardError('');

      try {
        const registrationIds = await resolveRegistrationIds();

        if (registrationIds.length === 0) {
          setExams([]);
          return;
        }

        const allResponses = await Promise.all(registrationIds.map((id) => getStudentBatchExams(id)));
        const merged = allResponses.flatMap((response) => safeArray(response));

        const uniqueByExam = [];
        const seen = new Set();

        merged.forEach((exam, index) => {
          const key = String(getValue(exam?.examId, exam?.ExamId, index));
          if (!seen.has(key)) {
            seen.add(key);
            uniqueByExam.push(exam);
          }
        });

        setExams(uniqueByExam);
      } catch (error) {
        setDashboardError('Unable to load latest dashboard updates right now.');
        setExams([]);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      loadDashboard(true);
    }, [studentId]);

    const onRefresh = async () => {
      setRefreshing(true);
      try {
        await loadDashboard(false);
      } finally {
        setRefreshing(false);
      }
    };

    const normalizedExams = useMemo(() => {
      return safeArray(exams)
        .map((exam, index) => {
          const attendedRaw = getValue(exam?.isAttended, exam?.IsAttended, 0);
          const isAttended = toNumber(attendedRaw) === 1;

          return {
            id: String(getValue(exam?.examId, exam?.ExamId, index)),
            topicName: getValue(exam?.topicName, exam?.TopicName, 'N/A'),
            batchName: getValue(exam?.batchName, exam?.BatchName, 'N/A'),
            examDate: getValue(exam?.examDate, exam?.ExamDate),
            totalQuestions: toNumber(getValue(exam?.totalQuestions, exam?.TotalQuestions, 0)),
            isAttended,
          };
        })
        .sort((first, second) => {
          const firstDate = new Date(first.examDate || 0).getTime();
          const secondDate = new Date(second.examDate || 0).getTime();
          return firstDate - secondDate;
        });
    }, [exams]);

    const examStats = useMemo(() => {
      const today = new Date();
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const upcoming = normalizedExams.filter((exam) => {
        const examDate = new Date(exam.examDate);
        return examDate > todayEnd && !exam.isAttended;
      }).length;

      const todayCount = normalizedExams.filter((exam) => {
        const examDate = new Date(exam.examDate);
        return examDate >= todayStart && examDate <= todayEnd;
      }).length;

      const completed = normalizedExams.filter((exam) => exam.isAttended).length;

      return {
        total: normalizedExams.length,
        upcoming,
        today: todayCount,
        completed,
      };
    }, [normalizedExams]);

    const latestExams = useMemo(() => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const upcoming = normalizedExams.filter((exam) => {
        const examDate = new Date(exam.examDate);
        return examDate >= todayStart;
      });

      return upcoming.slice(0, 6);
    }, [normalizedExams]);

    const tickerText = useMemo(() => {
      if (latestExams.length === 0) {
        return 'No upcoming exams currently. Stay focused and check back soon.';
      }

      return latestExams
        .map((exam) => `${exam.topicName} (${formatDate(exam.examDate)}) • ${exam.batchName}`)
        .join('     ✦     ');
    }, [latestExams]);

    useEffect(() => {
      tickerAnim.setValue(0);

      const loop = Animated.loop(
        Animated.timing(tickerAnim, {
          toValue: 1,
          duration: 14000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );

      loop.start();

      return () => {
        loop.stop();
      };
    }, [tickerAnim, tickerText]);

    const tickerTranslateX = tickerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -420],
    });

    if (loading) {
      return (
        <PrivateLayout title="Dashboard" navItems={STUDENT_NAV_ITEMS}>
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loaderText}>Preparing your dashboard...</Text>
          </View>
        </PrivateLayout>
      );
    }

    return (
      <PrivateLayout title="Dashboard" navItems={STUDENT_NAV_ITEMS}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroTag}>Welcome back</Text>
              <Text style={styles.heroName}>{studentName}</Text>
              <Text style={styles.heroSubText}>Enrollment ID: {enrollmentId}</Text>
            </View>
            <View style={styles.heroIconWrap}>
              <MaterialIcons name="school" size={26} color="#1E3A8A" />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{examStats.total}</Text>
              <Text style={styles.statLabel}>Total Exams</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{examStats.today}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{examStats.upcoming}</Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Links</Text>
              <Text style={styles.sectionHint}>Shortcuts to your essentials</Text>
            </View>

            <View style={styles.quickLinksGrid}>
              {QUICK_LINKS.map((item) => (
                <TouchableOpacity
                  key={item.routeName}
                  style={styles.quickLinkItem}
                  onPress={() => navigation.navigate(item.routeName)}
                  activeOpacity={0.86}
                >
                  <View style={[styles.quickIconWrap, { backgroundColor: `${item.color}14` }]}>
                    <MaterialIcons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={styles.quickLabel}>{item.label}</Text>
                  <MaterialIcons name="chevron-right" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Latest Exams</Text>
                <Text style={styles.sectionHint}>Live running updates for your schedule</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('StudentExams')}>
                <Text style={styles.linkText}>View all</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tickerWrap}>
              <MaterialIcons name="campaign" size={16} color="#1D4ED8" />
              <View style={styles.tickerViewport}>
                <Animated.View style={[styles.tickerTrack, { transform: [{ translateX: tickerTranslateX }] }]}>
                  <Text style={styles.tickerText}>{tickerText}</Text>
                  <Text style={styles.tickerText}>     ✦     {tickerText}</Text>
                </Animated.View>
              </View>
            </View>

            {latestExams.length > 0 ? (
              <View style={styles.examPreviewList}>
                {latestExams.slice(0, 3).map((exam) => (
                  <View key={exam.id} style={styles.examPreviewItem}>
                    <View style={styles.examDot} />
                    <View style={styles.examPreviewContent}>
                      <Text style={styles.examTopic} numberOfLines={1}>{exam.topicName}</Text>
                      <Text style={styles.examMeta} numberOfLines={1}>
                        {formatDate(exam.examDate)} • {exam.batchName} • {exam.totalQuestions} Qs
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyLatestWrap}>
                <Text style={styles.emptyLatestText}>No upcoming exams right now.</Text>
              </View>
            )}
          </View>

          {dashboardError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Could not refresh all dashboard sections</Text>
              <Text style={styles.errorText}>{dashboardError}</Text>
            </View>
          ) : null}
        </ScrollView>
      </PrivateLayout>
    );
  };

  export default StudentDashboardScreen;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8FAFC',
    },
    contentContainer: {
      paddingBottom: 20,
    },
    loaderWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loaderText: {
      marginTop: 10,
      color: '#64748B',
      fontSize: 13,
      fontWeight: '600',
    },
    heroCard: {
      marginBottom: 12,
      backgroundColor: '#EEF4FF',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#D7E6FF',
      paddingHorizontal: 14,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    heroLeft: {
      flex: 1,
      paddingRight: 8,
    },
    heroTag: {
      color: '#1D4ED8',
      fontSize: 12,
      fontWeight: '700',
    },
    heroName: {
      marginTop: 4,
      fontSize: 20,
      color: '#0F172A',
      fontWeight: '800',
    },
    heroSubText: {
      marginTop: 4,
      color: '#475569',
      fontSize: 12,
      fontWeight: '600',
    },
    heroIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: '#DBEAFE',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#BFDBFE',
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: '800',
      color: '#0F172A',
    },
    statLabel: {
      marginTop: 2,
      fontSize: 12,
      color: '#64748B',
      fontWeight: '600',
    },
    sectionCard: {
      marginBottom: 12,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      padding: 14,
    },
    sectionHeader: {
      marginBottom: 10,
    },
    sectionHeaderRow: {
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      fontSize: 16,
      color: '#0F172A',
      fontWeight: '800',
    },
    sectionHint: {
      marginTop: 2,
      fontSize: 12,
      color: '#64748B',
      fontWeight: '600',
    },
    quickLinksGrid: {
      gap: 8,
    },
    quickLinkItem: {
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },
    quickIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    quickLabel: {
      flex: 1,
      color: '#334155',
      fontSize: 14,
      fontWeight: '700',
    },
    linkText: {
      color: '#2563EB',
      fontWeight: '700',
      fontSize: 12,
    },
    tickerWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#DBEAFE',
      backgroundColor: '#EFF6FF',
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    tickerViewport: {
      marginLeft: 8,
      flex: 1,
      overflow: 'hidden',
    },
    tickerTrack: {
      flexDirection: 'row',
      alignItems: 'center',
      width: 1200,
    },
    tickerText: {
      color: '#1E40AF',
      fontSize: 12,
      fontWeight: '700',
    },
    examPreviewList: {
      marginTop: 10,
      gap: 8,
    },
    examPreviewItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: '#F8FAFC',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      paddingVertical: 8,
      paddingHorizontal: 9,
    },
    examDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 6,
      marginRight: 8,
      backgroundColor: '#2563EB',
    },
    examPreviewContent: {
      flex: 1,
    },
    examTopic: {
      color: '#0F172A',
      fontSize: 13,
      fontWeight: '700',
    },
    examMeta: {
      marginTop: 2,
      color: '#64748B',
      fontSize: 11,
      fontWeight: '600',
    },
    emptyLatestWrap: {
      marginTop: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: '#F8FAFC',
      paddingVertical: 12,
      alignItems: 'center',
    },
    emptyLatestText: {
      color: '#64748B',
      fontSize: 12,
      fontWeight: '600',
    },
    errorBox: {
      backgroundColor: '#FEF2F2',
      borderColor: '#FECACA',
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    errorTitle: {
      color: '#B91C1C',
      fontSize: 13,
      fontWeight: '700',
    },
    errorText: {
      marginTop: 4,
      color: '#B91C1C',
      fontSize: 12,
      fontWeight: '600',
    },
  });
