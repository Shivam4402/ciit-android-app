import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';


const axiosClient = axios.create({
  baseURL: 'http://192.168.169.20:5158/api',
  // baseURL: 'http://10.0.2.2:5158/api',
  // baseURL: 'https://api.ciitstudent.com/api',


  timeout: 10000,
});

axiosClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);  

export default axiosClient;