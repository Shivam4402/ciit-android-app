import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Dashboard from '../features/dashboard/screens/Dashboard';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { Alert } from 'react-native';


const Stack = createNativeStackNavigator();

const PrivateNavigator = () => {
    const dispatch = useDispatch();

    const handleLogout = async () => {
        Alert.alert(
            "Logout",
            "Are you sure?",
            [
                { text: "Cancel" },
                {
                    text: "Yes",
                    onPress: async () => {
                        await AsyncStorage.removeItem('token');
                        dispatch(logout());
                    }
                }
            ]
        );
    };

    return (
        <Stack.Navigator>
            <Stack.Screen
                name="Dashboard"
                component={Dashboard}
                options={{
                    headerRight: () => (
                        <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
                            <Icon name="logout" size={24} color="red" />
                        </TouchableOpacity>
                    ),
                }}
            />
        </Stack.Navigator>
    );
};

export default PrivateNavigator;