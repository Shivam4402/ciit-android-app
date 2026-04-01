import React from 'react';
import {StyleSheet, View, Text } from 'react-native';
import PrivateLayout from '../../../components/PrivateLayout';
import { useSelector } from 'react-redux';


const Dashboard = () => {
  const staff = useSelector((state) => state.auth.staff);
  const staffName = `${staff?.StaffName || staff?.userName || 'Staff'}`.trim();

  return (
    <PrivateLayout title="Dashboard">
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.label}>Welcome back</Text>
          <Text style={styles.name}>{staffName}</Text>
        </View>
      </View>
    </PrivateLayout>
  );
};

export default Dashboard;


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
  }
});