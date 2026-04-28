import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StudentDashboardScreen from '../features/student/screens/StudentDashboardScreen';
import StudentCoursesScreen from '../features/student/screens/StudentCoursesScreen';
import StudentFeeDetailsScreen from '../features/student/screens/StudentFeeDetailsScreen';
import StudentBatchesScreen from '../features/student/screens/StudentBatchesScreen';
import StudentExamsScreen from '../features/student/screens/StudentExamsScreen';
import StudentExamReportScreen from '../features/student/screens/StudentExamReportScreen';
import StudentTopicsScreen from '../features/student/screens/StudentTopicsScreen';
import PlayerScreen from '../components/PlayerScreen';

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
      <Stack.Screen
        name="StudentBatches"
        component={StudentBatchesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StudentTopics"
        component={StudentTopicsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StudentExams"
        component={StudentExamsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StudentExamReport"
        component={StudentExamReportScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StudentFeeDetails"
        component={StudentFeeDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CoursePlayer"
        component={PlayerScreen}
        options={{ headerShown: false }}
      />
     
    </Stack.Navigator>
  );
};

export default StudentPrivateNavigator;
