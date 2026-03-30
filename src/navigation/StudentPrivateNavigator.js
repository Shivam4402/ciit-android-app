import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StudentDashboardScreen from '../features/student/screens/StudentDashboardScreen';
import StudentCoursesScreen from '../features/student/screens/StudentCoursesScreen';

const Stack = createNativeStackNavigator();

const StudentPrivateNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="StudentDashboard">
      <Stack.Screen
        name="StudentDashboard"
        component={StudentDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StudentCourses"
        component={StudentCoursesScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default StudentPrivateNavigator;
