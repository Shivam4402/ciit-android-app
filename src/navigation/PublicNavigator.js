import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../features/auth/screens/LoginScreen';
import StudentLoginScreen from '../features/auth/screens/StudentLoginScreen';
import EnquiryFormScreen from '../features/enquiry/screens/EnquiryFormScreen';
import EnquiryListScreen from '../features/enquiry/screens/EnquiryListScreen';

const Stack = createNativeStackNavigator();

const PublicNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="StudentLogin" component={StudentLoginScreen}  options={{ headerShown: false}} />
      <Stack.Screen name="Login" component={LoginScreen}   options={{ headerShown: false}}  />
      <Stack.Screen name="Enquiry" component={EnquiryFormScreen} />
      <Stack.Screen name="EnquiryList" component={EnquiryListScreen}  />
    </Stack.Navigator>
  );
};

export default PublicNavigator;