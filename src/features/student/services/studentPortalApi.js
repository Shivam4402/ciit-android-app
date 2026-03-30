import axiosClient from '../../../api/axiosClient';

const getValue = (...values) => values.find((value) => value !== undefined && value !== null);

export const getStudentDetailsById = async (studentId) => {
  const response = await axiosClient.get('/students/details');
  const list = Array.isArray(response.data) ? response.data : response.data?.data || [];

  const matchedStudent = list.find((item) => {
    const id = getValue(item.studentId, item.StudentId);
    return String(id) === String(studentId);
  });

  return matchedStudent || null;
};
