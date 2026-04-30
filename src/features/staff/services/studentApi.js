import axiosClient from '../../../api/axiosClient';

export const getAllStudents = async () => {
    try {
        const response = await axiosClient.get('/students/details');

        if (Array.isArray(response.data)) {
            return response.data;
        }

        return response.data?.data || [];
    } catch (error) {
        console.log('Error fetching students:', error);
        throw error;
    }
};

export const getBranches = async () => {
    try {
        const response = await axiosClient.get('/branches');

        if (Array.isArray(response.data)) {
            return response.data;
        }

        return response.data?.data || [];
    } catch (error) {
        console.log('Error fetching branches:', error);
        throw error;
    }
};

export const getStudentExamReportByStudentId = async (studentId) => {
    try {
        if (!studentId) return [];

        const response = await axiosClient.get(`/students/student-exam-report-by-student/${studentId}`);

        if (Array.isArray(response.data)) {
            return response.data;
        }

        return response.data?.data || [];
    } catch (error) {
        if (error?.response?.status === 404) {
            return [];
        }

        console.log('Error fetching student exam report by student id:', error);
        throw error;
    }
};

export const generateCourseCertificate = async (studentId) => {
    try {
        if (!studentId) return '';

        const response = await axiosClient.post('/students/generate-course-certificate', {
            StudentId: studentId,
        });

        if (typeof response.data === 'string') {
            return response.data;
        }

        return response.data?.data || response.data?.result || '';
    } catch (error) {
        if (error?.response?.status === 404) {
            return '';
        }

        console.log('Error generating course certificate:', error);
        throw error;
    }
};
