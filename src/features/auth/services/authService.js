import axiosClient from '../../../api/axiosClient';

export const loginApi = async (data) => {
  console.log("Login data:", data);
  const response = await axiosClient.post('/auth/login', data);
  console.log("Login response:", response);
  return response.data;
};