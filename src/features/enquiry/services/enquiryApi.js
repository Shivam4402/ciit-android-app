import axiosClient from '../../../api/axiosClient';

// GET APIs

export const getAllEnquiries = async () => {
  const response = await axiosClient.get('/enquiries'); 
  return response.data;
};

export const getLeadSources = async () => {
    const response = await axiosClient.get('/lead-sources');
      return Array.isArray(response.data)
    ? response.data
    : response.data.data || []; 
};

export const getEnquiryFors = async () => {
  const response = await axiosClient.get('/enquiry-for');
    return Array.isArray(response.data)
    ? response.data
    : response.data.data || []; 
};

export const getTopics = async () => {
  const response = await axiosClient.get('/training-topics');
    return Array.isArray(response.data)
    ? response.data
    : response.data.data || []; 
};

export const getQualifications = async () => {
  const response = await axiosClient.get('/qualifications');
  return Array.isArray(response.data)
    ? response.data
    : response.data.data || [];  
};

export const getBranches = async () => {
  const response = await axiosClient.get('/branches');
    return Array.isArray(response.data)
    ? response.data
    : response.data.data || []; 
};

// POST API
export const createEnquiry = async (data) => {
  try {
    const response = await axiosClient.post('/enquiries', data);
      return Array.isArray(response.data)
    ? response.data
    : response.data.data || []; 
  } catch (error) {
    console.log("Error in createEnquiry:", error);
    throw error;
  }
};