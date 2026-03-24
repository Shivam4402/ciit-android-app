import axiosClient from '../../../api/axiosClient';

// GET APIs
export const getLeadSources = () =>
  axiosClient.get('/lead-sources');

export const getEnquiryFors = () =>
  axiosClient.get('/enquiry-for');

export const getTopics = () =>
  axiosClient.get('/training-topics');

export const getQualifications = () =>
  axiosClient.get('/qualifications');

export const getBranches = () =>
  axiosClient.get('/branches');

// POST API
export const createEnquiry = (data) =>
  axiosClient.post('/enquiries', data);