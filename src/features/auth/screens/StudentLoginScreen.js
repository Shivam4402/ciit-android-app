import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loginStudent } from '../authSlice';

const StudentLoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');

  const handleStudentLogin = async () => {
    await dispatch(loginStudent({ userName, password }));
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Logo Section */}
      <View style={styles.logoContainer}>
          <Image
            source={require('../../../../assets/mainlogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        <Text style={styles.subtitle}>Learn IT Skills. Build Your Career.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Student Login</Text>

        <TextInput
          placeholder="PIN or Email"
          placeholderTextColor="#888"
          style={styles.input}
          value={userName}
          onChangeText={setUserName}
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#888"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleStudentLogin}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>LOGIN</Text>
          )}
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Back to Staff Login</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('Enquiry')}>
        <Text style={styles.link}>Fill Enquiry Form (No Login Required)</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('EnquiryList')}>
        <Text style={styles.link}>View All Enquiries</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default StudentLoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    justifyContent: 'center',
    padding: 20,
  },
  
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20
  },

  logo: {
    width: 140,
    height: 80,
    marginBottom: 0,
  },

  
  subtitle: {
    fontSize: 13,
    color: '#777',
    marginTop: 0
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    elevation: 5,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  input: {
    backgroundColor: '#F1F3F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 14,
  },
  button: {
    backgroundColor: '#1E88E5',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  error: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
  link: {
    color: '#1E88E5',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    fontWeight: '500',
  },
});
