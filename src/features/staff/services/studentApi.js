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
