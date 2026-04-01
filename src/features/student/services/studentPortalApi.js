import axiosClient from '../../../api/axiosClient';
export const getStudentDetailsById = async (studentId) => {
    try {
        if (!studentId) return null;

        const response = await axiosClient.get(`/students/details/${studentId}`);

        if (response?.data && !response.data.data) {
            return response.data;
        }

        return response.data?.data || null;

    } catch (error) {
        console.log('Error fetching student details:', error);
        throw error;
    }
};

export const getStudentWiseBatchDetails = async (studentId) => {
    try {
        if (!studentId) return [];

        const response = await axiosClient.get(`/students/student-wise-batches/${studentId}`);

        if (response?.data && response.data.data !== undefined) {
            return response.data.data || [];
        }

        return response?.data || [];
    } catch (error) {
        console.log('Error fetching student batch details:', error);
        throw error;
    }
};