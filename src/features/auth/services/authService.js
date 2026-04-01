import axiosClient from '../../../api/axiosClient';

export const loginApi = async (data) => {
  console.log("Login data:", data);
  const response = await axiosClient.post('/auth/login', data);
  console.log("Login response:", response);
  return response.data;
};

export const studentLoginApi = async ({ userName, password }) => {
  const payload = {
    UserName: userName,
    Password: password,
  };

  console.log("Student Login payload:", payload);
  const response = await axiosClient.post('/auth/student-login', payload);
  console.log("Student Login response:", response);
  return response.data;
}
  