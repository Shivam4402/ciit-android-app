import { useEffect, useState } from 'react';
import {
  getLeadSources,
  getEnquiryFors,
  getTopics,
  getQualifications,
  getBranches
} from '../services/enquiryApi';

export const useEnquiry = () => {
  const [leadSources, setLeadSources] = useState([]);
  const [enquiryFors, setEnquiryFors] = useState([]);
  const [topics, setTopics] = useState([]);
  const [qualifications, setQualifications] = useState([]);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [ls, ef, tp, ql, br] = await Promise.all([
        getLeadSources(),
        getEnquiryFors(),
        getTopics(),
        getQualifications(),
        getBranches()
      ]);

      setLeadSources(ls.data.data);
      setEnquiryFors(ef.data.data);
      setTopics(tp.data.data);
      setQualifications(ql.data.data);
      setBranches(br.data.data);

    } catch (err) {
      console.log("Error loading dropdown data", err);
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