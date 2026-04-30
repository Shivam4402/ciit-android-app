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

export const getStudentBatchAttendance = async (batchId, registrationId) => {
    try {
        if (!batchId || !registrationId) return [];

        const response = await axiosClient.get(
            `/students/student-batch-attendance/${batchId}/${registrationId}`,
        );

        if (response?.data && response.data.data !== undefined) {
            return response.data.data || [];
        }

        return response?.data || [];
    } catch (error) {
        if (error?.response?.status === 404) {
            return [];
        }

        console.log('Error fetching student attendance:', error);
        throw error;
    }
};

export const getStudentBatchExams = async (registrationId) => {
    try {
        if (!registrationId) return [];

        const response = await axiosClient.get(`/students/student-batch-exams/${registrationId}`);

        if (response?.data && response.data.data !== undefined) {
            return response.data.data || [];
        }

        return response?.data || [];
    } catch (error) {
        if (error?.response?.status === 404) {
            return [];
        }

        console.log('Error fetching student batch exams:', error);
        throw error;
    }
};



export const getStudentRegistrationDetails = async (studentId) => {
    try {
        if (!studentId) return [];

        const response = await axiosClient.get(`/student-registrations/student-registration-details/${studentId}`);
        if (response?.data && response.data.data !== undefined) {
            return response.data.data || [];
        }

        return response?.data || [];
    } catch (error) {
        if (error?.response?.status === 404) {
            return [];
        }
        console.log('Error fetching student registration details:', error);
        throw error;
    }
};


export const getStudentCourseTopics = async (registrationId) => {
    try {
        if (!registrationId) return null;

        const response = await axiosClient.get(`/students/student-course-topics/${registrationId}`);

        if (response?.data && response.data.data !== undefined) {
            return response.data.data || null;
        }

        return response?.data || null;
    } catch (error) {
        if (error?.response?.status === 404) {
            return null;
        }

        console.log('Error fetching student course topics:', error);
        throw error;
    }
};

export const getStudentExamReport = async (registrationId) => {
    try {
        if (!registrationId) return [];

        const response = await axiosClient.get(`/students/student-exam-report/${registrationId}`);

        if (response?.data && response.data.data !== undefined) {
            return response.data.data || [];
        }

        return response?.data || [];
    } catch (error) {
        if (error?.response?.status === 404) {
            return [];
        }

        console.log('Error fetching student exam report:', error);
        throw error;
    }
};

export const generateStudentExamReportCertificate = async (registrationId) => {
    try {
        if (!registrationId) return '';

        const response = await axiosClient.post('/students/generate-exam-report-certificate', {
            RegistrationId: registrationId,
        });

        return response?.data || '';
    } catch (error) {
        console.log('Error generating exam report certificate:', error);
        throw error;
    }
};