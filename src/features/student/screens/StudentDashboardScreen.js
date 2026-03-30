import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import PrivateLayout from '../../../components/PrivateLayout';

const STUDENT_NAV_ITEMS = [
  { label: 'Dashboard', routeName: 'StudentDashboard', icon: 'dashboard' },
  { label: 'Course List', routeName: 'StudentCourses', icon: 'menu-book' },
];

const StudentDashboardScreen = () => {
  const student = useSelector((state) => state.auth.student);

  return (
    <PrivateLayout title="Student Dashboard" navItems={STUDENT_NAV_ITEMS}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.label}>Welcome</Text>
          <Text style={styles.name}>
            {student?.StudentName || student?.studentName || 'Student'}{' '}
            {student?.LastName || student?.lastName || ''}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.meta}>Student ID: {student?.StudentId || student?.studentId || 'N/A'}</Text>
          <Text style={styles.meta}>Code: {student?.StudentCode || student?.studentCode || 'N/A'}</Text>
          <Text style={styles.meta}>Email: {student?.EmailAddress || student?.emailAddress || 'N/A'}</Text>
          <Text style={styles.meta}>Mobile: {student?.MobileNumber || student?.mobileNumber || 'N/A'}</Text>
          <Text style={styles.meta}>Branch: {student?.BranchId || student?.branchId || 'N/A'}</Text>
        </View>
      </View>
    </PrivateLayout>
  );
};

export default StudentDashboardScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  label: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  name: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },
  meta: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 8,
  },
});
