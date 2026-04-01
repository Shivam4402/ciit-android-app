import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import PrivateLayout from '../../../components/PrivateLayout';
import { getStudentWiseBatchDetails } from '../services/studentPortalApi';

const STUDENT_NAV_ITEMS = [
  { label: 'Dashboard', routeName: 'StudentDashboard', icon: 'dashboard' },
  { label: 'My Batches', routeName: 'StudentBatches', icon: 'groups' },
  { label: 'Course Fee Details', routeName: 'StudentFeeDetails', icon: 'account-balance-wallet' },
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

const StudentBatchesScreen = () => {
  const student = useSelector((state) => state.auth.student);
  const studentId = student?.StudentId || student?.studentId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [batches, setBatches] = useState([]);

  const loadBatches = async (showLoader = true) => {
    if (!studentId) {
      setBatches([]);
      setLoading(false);
      return;
    }

    if (showLoader) {
      setLoading(true);
    }

    setError('');

    try {
      const response = await getStudentWiseBatchDetails(studentId);
      setBatches(safeArray(response));
    } catch (requestError) {
      setError('Unable to load batches right now.');
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches(true);
  }, [studentId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadBatches(false);
    } finally {
      setRefreshing(false);
    }
  };

  const batchItems = useMemo(() => {
    return safeArray(batches).map((batch, index) => ({
      id: String(getValue(batch?.batchStudentId, batch?.BatchStudentId, index)),
      batchName: getValue(batch?.batchName, batch?.BatchName, 'N/A'),
      batchTime: getValue(batch?.batchTime, batch?.BatchTime, 'N/A'),
      courseName: getValue(batch?.courseName, batch?.CourseName, 'N/A'),
      topicName: getValue(batch?.topicName, batch?.TopicName, 'N/A'),
      employeeName: getValue(batch?.employeeName, batch?.EmployeeName, 'N/A'),
      startDate: getValue(batch?.startDate, batch?.StartDate),
      registrationDate: getValue(batch?.registrationDate, batch?.RegistrationDate),
    }));
  }, [batches]);

  if (loading) {
    return (
      <PrivateLayout title="My Batches" navItems={STUDENT_NAV_ITEMS}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout title="My Batches" navItems={STUDENT_NAV_ITEMS}>
      <View style={styles.container}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!studentId ? (
          <Text style={styles.emptyText}>Student profile not available.</Text>
        ) : batchItems.length === 0 ? (
          <Text style={styles.emptyText}>No batches found.</Text>
        ) : (
          <FlatList
            data={batchItems}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.title}>{item.batchName}</Text>
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>{item.batchTime}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>Course: {item.courseName}</Text>
                <Text style={styles.meta}>Topic: {item.topicName}</Text>
                <Text style={styles.meta}>Trainer: {item.employeeName}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaSmall}>Start: {formatDate(item.startDate)}</Text>
                  <Text style={styles.metaSmall}>Registered: {formatDate(item.registrationDate)}</Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </PrivateLayout>
  );
};

export default StudentBatchesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  pill: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: 8,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  meta: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  metaSmall: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#64748B',
    fontSize: 14,
  },
  error: {
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 12,
  },
});
