import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';  
import { useNavigation } from '@react-navigation/native';
import PrivateLayout from '../../../components/PrivateLayout';

const STUDENT_NAV_ITEMS = [
  { label: 'Dashboard', routeName: 'StudentDashboard', icon: 'dashboard' },
  // { label: 'Course List', routeName: 'StudentCourses', icon: 'menu-book' },
  { label: 'My Courses', routeName: 'StudentFeeDetails', icon: 'menu-book' },
  { label: 'My Batches', routeName: 'StudentBatches', icon: 'groups' },
  { label: 'My Exams', routeName: 'StudentExams', icon: 'fact-check' },
];

const StudentDashboardScreen = () => {
  const navigation = useNavigation();
  const student = useSelector((state) => state.auth.student);
  const studentName = `${student?.StudentName || student?.studentName || 'Student'} ${student?.LastName || student?.lastName || ''}`.trim();

  return (
    <PrivateLayout title="Dashboard" navItems={STUDENT_NAV_ITEMS}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.label}>Welcome back</Text>
          <Text style={styles.name}>{studentName}</Text>
        </View>
      {/*
        <View style={styles.quickActionCard}>
          <Text style={styles.quickTitle}>Quick Actions</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('StudentFeeDetails')}
            style={styles.primaryActionBtn}
          >
            <Text style={styles.primaryActionText}>View Course Fee Details</Text>
          </TouchableOpacity>
        </View> */}
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
    marginBottom: 12,
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
  helperText: {
    marginTop: 8,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  quickActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  quickTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  primaryActionBtn: {
    backgroundColor: '#1D4ED8',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
