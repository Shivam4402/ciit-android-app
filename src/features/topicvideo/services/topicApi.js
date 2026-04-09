import axiosClient from '../../../api/axiosClient';


export const getTopics = async () => {
    try {
        const response = await axiosClient.get(`/training-topics`);

        if (response?.data && response.data.data !== undefined) {
            return response.data.data || [];
        }

        return response?.data || [];
    } catch (error) {
        if (error?.response?.status === 404) {
            return [];
        }

        console.log('Error fetching topics:', error);
        throw error;
    }
};