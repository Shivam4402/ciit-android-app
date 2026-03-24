import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../features/auth/screens/LoginScreen';
import EnquiryFormScreen from '../features/enquiry/screens/EnquiryFormScreen';

const Stack = createNativeStackNavigator();

const PublicNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Login" component={LoginScreen}   options={{ headerShown: false }}  />
      <Stack.Screen name="Enquiry" component={EnquiryFormScreen} />
    </Stack.Navigator>
  );
};

export default PublicNavigator;