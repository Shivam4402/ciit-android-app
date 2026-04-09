import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import PrivateLayout from '../../../components/PrivateLayout';
import { getStudentDetailsById } from '../services/studentPortalApi';
import { STUDENT_NAV_ITEMS } from '../shared/studentNavItems';

const getValue = (...values) => values.find((value) => value !== undefined && value !== null);
const safeArray = (value) => (Array.isArray(value) ? value : []);

const StudentCoursesScreen = () => {
  const student = useSelector((state) => state.auth.student);
  const studentId = student?.StudentId || student?.studentId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [registrations, setRegistrations] = useState([]);

  const loadCourses = async (showLoader = true) => {
    if (!studentId) {
      setRegistrations([]);
      setLoading(false);
      return;
    }

    if (showLoader) {
      setLoading(true);
    }

    setError('');

    try {
      const studentDetails = await getStudentDetailsById(studentId);
      const studentRegistrations = safeArray(
        getValue(studentDetails?.registrations, studentDetails?.Registrations),
      );

      setRegistrations(studentRegistrations);
    } catch (requestError) {
      setError('Unable to load course list right now.');
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses(true);
  }, [studentId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadCourses(false);
    } finally {
      setRefreshing(false);
    }
  };

  const courseItems = useMemo(() => {
    return registrations.map((registration, index) => {
      const fee = getValue(registration?.courseFee, registration?.CourseFee);
      const course = getValue(fee?.course, fee?.Course);

      return {
        id: String(getValue(registration?.registrationId, registration?.RegistrationId, index)),
        courseName: getValue(course?.courseName, course?.CourseName, 'N/A'),
        status: getValue(registration?.currentStatus, registration?.CurrentStatus, 'N/A'),
        registrationDate: getValue(
          registration?.registrationDate,
          registration?.RegistrationDate,
          'N/A',
        ),
        feeAmount: getValue(fee?.feesAmount, fee?.FeesAmount, 0),
      };
    });
  }, [registrations]);

  if (loading) {
    return (
      <PrivateLayout title="Course List" navItems={STUDENT_NAV_ITEMS}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout title="Course List" navItems={STUDENT_NAV_ITEMS}>
      <View style={styles.container}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!studentId ? (
          <Text style={styles.emptyText}>Student profile not available.</Text>
        ) : courseItems.length === 0 ? (
          <Text style={styles.emptyText}>No courses found.</Text>
        ) : (
          <FlatList
            data={courseItems}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.title}>{item.courseName}</Text>
                <Text style={styles.meta}>Status: {item.status}</Text>
                <Text style={styles.meta}>Registered: {String(item.registrationDate).slice(0, 10)}</Text>
                <Text style={styles.meta}>Fee: ₹ {item.feeAmount}</Text>
              </View>
            )}
          />
        )}
      </View>
    </PrivateLayout>
  );
};

export default StudentCoursesScreen;

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
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  meta: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 4,
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
