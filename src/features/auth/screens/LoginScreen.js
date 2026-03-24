import React, { useState } from 'react';
import { View, TextInput, Button, Text, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../authSlice';

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');

  const handleLogin = async () => {
    const result = await dispatch(loginUser({ userName, email }));

    if (result.meta.requestStatus === 'fulfilled') {
      navigation.replace('Dashboard');
    }
  };

  return (
    <View>
      <TextInput placeholder="Username" onChangeText={setUserName} />
      <TextInput placeholder="Email" onChangeText={setEmail} />

      <TouchableOpacity onPress={() => navigation.navigate('Enquiry')}>
        <Text style={{ color: 'blue', textAlign: 'center', marginTop: 10, marginBottom: 10 }}>
          Fill Enquiry Form (No Login Required)
        </Text>
      </TouchableOpacity>

      <Button title="Login" onPress={handleLogin} />

      {loading && <Text>Loading...</Text>}
      {error && <Text>{error}</Text>}
    </View>
  );
};

export default LoginScreen;