import { useEffect, useState } from "react";
import {
  getLeadSources,
  getEnquiryFors,
  getTopics,
  getQualifications,
  getBranches
} from "../services/enquiryApi";

export const useEnquiry = () => {
  const [leadSources, setLeadSources] = useState([]);
  const [enquiryFors, setEnquiryFors] = useState([]);
  const [topics, setTopics] = useState([]);
  const [qualifications, setQualifications] = useState([]);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [
        lead,
        enquiry,
        topic,
        qual,
        branch
      ] = await Promise.all([
        getLeadSources(),
        getEnquiryFors(),
        getTopics(),
        getQualifications(),
        getBranches()
      ]);

      setLeadSources(lead || []);
      setEnquiryFors(enquiry || []);
      setTopics(topic || []);
      setQualifications(qual || []);
      setBranches(branch || []);

    } catch (err) {
      console.log("Error loading enquiry data", err);
    }
  };

  return {
    leadSources,
    enquiryFors,
    topics,
    qualifications,
    branches
  };
};