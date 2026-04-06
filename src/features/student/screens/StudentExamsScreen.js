import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSelector } from 'react-redux';
import PrivateLayout from '../../../components/PrivateLayout';
import { getStudentBatchExams, getStudentWiseBatchDetails } from '../services/studentPortalApi';

const STUDENT_NAV_ITEMS = [
  { label: 'Dashboard', routeName: 'StudentDashboard', icon: 'dashboard' },
  { label: 'My Courses', routeName: 'StudentFeeDetails', icon: 'menu-book' },
  { label: 'My Batches', routeName: 'StudentBatches', icon: 'groups' },
  { label: 'My Exams', routeName: 'StudentExams', icon: 'fact-check' },
];

const getValue = (...values) => values.find((value) => value !== undefined && value !== null);
const safeArray = (value) => (Array.isArray(value) ? value : []);

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

const formatTime = (dateValue) => {
  if (!dateValue) {
    return 'N/A';
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const StudentExamsScreen = () => {
  const student = useSelector((state) => state.auth.student);
  const studentId = getValue(student?.StudentId, student?.studentId);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [exams, setExams] = useState([]);
  const [activeTab, setActiveTab] = useState('today');


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

  const loadExams = async (showLoader = true) => {
    if (!studentId) {
      setExams([]);
      setLoading(false);
      return;
    }

    if (showLoader) {
      setLoading(true);
    }

    setError('');

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
    } catch (requestError) {
      setError('Unable to load exams right now.');
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams(true);
  }, [studentId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadExams(false);
    } finally {
      setRefreshing(false);
    }
  };

  const examItems = useMemo(() => {
    return safeArray(exams)
      .map((exam, index) => {
        const attendedRaw = getValue(exam?.isAttended, exam?.IsAttended, 0);
        const isAttended = toNumber(attendedRaw) === 1;

        return {
          id: String(getValue(exam?.examId, exam?.ExamId, index)),
          batchName: getValue(exam?.batchName, exam?.BatchName, 'N/A'),
          topicName: getValue(exam?.topicName, exam?.TopicName, 'N/A'),
          examDate: getValue(exam?.examDate, exam?.ExamDate),
          startTime: getValue(exam?.startTime, exam?.StartTime),
          endTime: getValue(exam?.endTime, exam?.EndTime),
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

  const filteredExams = useMemo(() => {
  const today = new Date();

  const isSameDay = (d1, d2) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  return examItems.filter((exam) => {
    const examDate = new Date(exam.examDate);

    if (activeTab === 'today') {
      return isSameDay(examDate, today);
    }

    if (activeTab === 'upcoming') {
      return examDate > today && !exam.isAttended;
    }

    if (activeTab === 'completed') {
      return examDate < today.setHours(0, 0, 0, 0);
    }

    return true;
  });
}, [examItems, activeTab]);

  if (loading) {
    return (
      <PrivateLayout title="My Exams" navItems={STUDENT_NAV_ITEMS}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loaderText}>Fetching your exams...</Text>
        </View>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout title="My Exams" navItems={STUDENT_NAV_ITEMS}>
      <View style={styles.container}>
        {error ? (
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>We ran into a problem</Text>
            <Text style={styles.alertText}>{error}</Text>
          </View>
        ) : null}

<View style={styles.tabContainer}>
  {['today', 'upcoming', 'completed'].map((tab) => (
    <TouchableOpacity
      key={tab}
      style={[
        styles.tabItem,
        activeTab === tab && styles.tabItemActive,
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Text
        style={[
          styles.tabText,
          activeTab === tab && styles.tabTextActive,
        ]}
      >
        {tab.charAt(0).toUpperCase() + tab.slice(1)}
      </Text>
    </TouchableOpacity>
  ))}
</View>
        {!studentId ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Student profile not available</Text>
            <Text style={styles.emptyText}>Please sign in again to load your exams.</Text>
          </View>
        ) : examItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No exams found</Text>
            <Text style={styles.emptyText}>Upcoming and past exams will appear here.</Text>
          </View>
        ) : (

            
          <FlatList
            data={filteredExams}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <Text style={styles.title}>{item.topicName}</Text>
                    <Text style={styles.subtitle}>{item.batchName}</Text>
                  </View>
                  <View style={[styles.statusPill, item.isAttended ? styles.statusSuccess : styles.statusPending]}>
                    <Text
                      style={[
                        styles.statusPillText,
                        item.isAttended ? styles.statusSuccessText : styles.statusPendingText,
                      ]}
                    >
                      {item.isAttended ? 'Attended' : 'Pending'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoBlock}>
                    <Text style={styles.infoLabel}>Exam Date</Text>
                    <Text style={styles.infoValue}>{formatDate(item.examDate)}</Text>
                  </View>
                  <View style={[styles.infoBlock, styles.infoBlockRight]}>
                    <Text style={styles.infoLabel}>Questions</Text>
                    <Text style={styles.infoValue}>{item.totalQuestions}</Text>
                  </View>
                </View>

                <View style={styles.timeCard}>
                  <Text style={styles.timeLabel}>Time Window</Text>
                  <Text style={styles.timeValue}>
                    {formatTime(item.startTime)} - {formatTime(item.endTime)}
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </PrivateLayout>
  );
};

export default StudentExamsScreen;

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
  },
  listContent: {
    paddingBottom: 20,
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
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusSuccess: {
    backgroundColor: '#DCFCE7',
  },
  statusSuccessText: {
    color: '#166534',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPendingText: {
    color: '#92400E',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  infoBlock: {
    flex: 1,
    minWidth: 0,
  },
  infoBlockRight: {
    alignItems: 'flex-end',
  },
  infoLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  timeCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#EFF6FF',
    padding: 10,
  },
  timeLabel: {
    fontSize: 11,
    color: '#475569',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  timeValue: {
    color: '#1E3A8A',
    fontSize: 13,
    fontWeight: '700',
  },
  tabContainer: {
  flexDirection: 'row',
  backgroundColor: '#F1F5F9',
  borderRadius: 10,
  padding: 4,
  marginBottom: 12,
},

tabItem: {
  flex: 1,
  paddingVertical: 8,
  alignItems: 'center',
  borderRadius: 8,
},

tabItemActive: {
  backgroundColor: '#FFFFFF',
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 1,
},

tabText: {
  fontSize: 13,
  fontWeight: '600',
  color: '#64748B',
},

tabTextActive: {
  color: '#0F172A',
},
});
