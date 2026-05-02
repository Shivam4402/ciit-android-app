import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Dashboard from '../features/staff/screens/Dashboard';
import StudentsListScreen from '../features/staff/screens/StudentsListScreen';
import EnquiryListScreen from '../features/staff/screens/EnquiryListScreen';
import CertificationScreen from '../features/staff/screens/CertificationScreen';


const Stack = createNativeStackNavigator();

const PrivateNavigator = () => {
    return (
        <Stack.Navigator initialRouteName="Dashboard">
            <Stack.Screen
                name="Dashboard"
                component={Dashboard}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="StudentsList"
                component={StudentsListScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="EnquiryList"
                component={EnquiryListScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Certification"
                component={CertificationScreen}
                options={{ headerShown: false }}
            />
        </Stack.Navigator>
    );
};

export default PrivateNavigator;