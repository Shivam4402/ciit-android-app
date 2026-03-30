import React from 'react';
import { View, Text } from 'react-native';
import PrivateLayout from '../../../components/PrivateLayout';

const Dashboard = () => {
  return (
    <PrivateLayout title="Dashboard">
      <View>
        <Text>Welcome to Dashboard</Text>
      </View>
    </PrivateLayout>
  );
};

export default Dashboard;