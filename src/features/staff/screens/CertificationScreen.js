import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import PrivateLayout from '../../../components/PrivateLayout';
import { Dropdown } from 'react-native-element-dropdown';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import ReactNativeBlobUtil from 'react-native-blob-util';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import Toast from 'react-native-toast-message';
import {
  getBranches,
  getAllStudents,
  getStudentExamReportByStudentId,
  generateCourseCertificate,
} from '../services/staffPortalApi';

const getValue = (...values) => values.find((v) => v !== undefined && v !== null);
const safeArray = (value) => (Array.isArray(value) ? value : []);

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (dateValue) => {
  if (!dateValue) return 'N/A';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString();
};

const formatPercent = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '0.00%';
  return `${parsed.toFixed(2)}%`;
};

const sanitizeFileName = (value) => String(value || 'Certificate').replace(/[^a-z0-9]+/gi, '_');

const CertificationScreen = () => {
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [branches, setBranches] = useState([]);
  const [students, setStudents] = useState([]);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const [bResp, sResp] = await Promise.all([getBranches(), getAllStudents()]);
        if (!mounted) return;
        setBranches(Array.isArray(bResp) ? bResp : []);

        // normalize students to ensure branchId and name exist
        const normalized = Array.isArray(sResp)
          ? sResp.map((s) => ({
              raw: s,
              id: getValue(s.studentId, s.StudentId, s.studentCode, s.StudentCode),
              branchId: getValue(s.branchId, s.BranchId, (s.latestRegistration && s.latestRegistration.branchId) || null),
              name:
                getValue(s.fullName, s.full_name) ||
                getValue(s.studentName, s.StudentName) ||
                `${getValue(s.studentName, s.StudentName, '')} ${getValue(s.lastName, s.LastName, '')}`.trim(),
            }))
          : [];

        setStudents(normalized);
      } catch (error) {
        console.log('Error loading branches/students', error);
        setBranches([]);
        setStudents([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const branchOptions = useMemo(() => {
    return (branches || []).map((b) => ({ label: b.branchName || b.BranchName || 'Unnamed', value: getValue(b.branchId, b.BranchId) }));
  }, [branches]);

  const studentOptions = useMemo(() => {
    if (!selectedBranch) return students.map((s) => ({ label: s.name || 'Unknown', value: s.id }));
    return students
      .filter((s) => String(getValue(s.branchId)) === String(selectedBranch))
      .map((s) => ({ label: s.name || 'Unknown', value: s.id }));
  }, [students, selectedBranch]);

  const selectedStudentObj = useMemo(
    () => students.find((s) => String(s.id) === String(selectedStudent)),
    [students, selectedStudent],
  );

  const reportItems = useMemo(() => {
    return safeArray(reports)
      .map((item, index) => ({
        id: String(getValue(item?.examId, item?.ExamId, index)),
        topicName: getValue(item?.topicName, item?.TopicName, 'N/A'),
        examDate: getValue(item?.examDate, item?.ExamDate),
        startTime: getValue(item?.startTime, item?.StartTime, 'N/A'),
        endTime: getValue(item?.endTime, item?.EndTime, 'N/A'),
        totalQuestions: toNumber(getValue(item?.totalQuestions, item?.TotalQuestions, 0)),
        correctQuestions: toNumber(getValue(item?.correctQuestions, item?.CorrectQuestions, 0)),
        wrongQuestions: toNumber(getValue(item?.wrongQuestions, item?.WrongQuestions, 0)),
        percentage: toNumber(getValue(item?.percentage, item?.Percentage, 0)),
        grade: getValue(item?.grade, item?.Grade, 'N/A'),
      }))
      .sort((first, second) => {
        const secondDate = new Date(second.examDate || 0).getTime();
        const firstDate = new Date(first.examDate || 0).getTime();
        return secondDate - firstDate;
      });
  }, [reports]);

  const summary = useMemo(() => {
    if (reportItems.length === 0) {
      return { totalExams: 0, avgPercentage: 0, excellentCount: 0 };
    }

    const totalPercentage = reportItems.reduce((accumulator, report) => accumulator + toNumber(report.percentage), 0);
    const excellentCount = reportItems.filter((report) => report.grade === 'Excellent').length;

    return {
      totalExams: reportItems.length,
      avgPercentage: totalPercentage / reportItems.length,
      excellentCount,
    };
  }, [reportItems]);

  const loadReport = async (studentId, showLoader = true) => {
    if (!studentId) {
      setReports([]);
      setError('');
      return;
    }

    if (showLoader) {
      setLoadingReport(true);
    }

    setError('');

    try {
      const response = await getStudentExamReportByStudentId(studentId);
      setReports(safeArray(response));
      if (safeArray(response).length === 0) {
        setError('No exams found for this student');
      }
    } catch (requestError) {
      console.log('Error loading student exam report:', requestError);
      setReports([]);
      setError('Unable to load exam report right now. Please try again.');
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      loadReport(selectedStudent, true);
    } else {
      setReports([]);
      setError('');
    }
  }, [selectedStudent]);

  const onRefresh = async () => {
    if (!selectedStudent) return;
    setRefreshing(true);
    try {
      await loadReport(selectedStudent, false);
    } finally {
      setRefreshing(false);
    }
  };

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const downloadCertificate = async () => {
  if (!selectedStudentObj?.id || reportItems.length === 0) {
    return;
  }

  setLoadingAction(true);

  try {
    const base64 = await generateCourseCertificate(selectedStudentObj.id);
    if (!base64) {
      throw new Error('Certificate payload missing');
    }

    const fileName = `${sanitizeFileName(
      `${selectedStudentObj.name || 'Student'}_Course_Certificate`
    )}.pdf`;

    let filePath = '';

    // ================= ANDROID =================
    if (Platform.OS === 'android') {
      const dirs = ReactNativeBlobUtil.fs.dirs;
      filePath = `${dirs.DownloadDir}/${fileName}`;

      await ReactNativeBlobUtil.fs.writeFile(filePath, base64, 'base64');

      await ReactNativeBlobUtil.fs.scanFile([
        { path: filePath, mime: 'application/pdf' },
      ]);

      await ReactNativeBlobUtil.android.addCompleteDownload({
        title: fileName,
        description: 'Course Certificate',
        mime: 'application/pdf',
        path: filePath,
        showNotification: true,
      });
    } 
    // ================= IOS =================
    else {
      filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;

      await RNFS.writeFile(filePath, base64, 'base64');
    }

    // ================= TOAST FIRST =================
    Toast.show({
      type: 'success',
      text1: 'Download Complete',
      text2: 'Opening your certificate...',
    });

    // ================= DELAY =================
    await sleep(500); // ⏳ 0.5 second delay

    // ================= OPEN FILE =================
    if (Platform.OS === 'android') {
      await ReactNativeBlobUtil.android.actionViewIntent(
        filePath,
        'application/pdf'
      );
    } else {
      await Share.open({
        url: `file://${filePath}`,
        type: 'application/pdf',
        filename: fileName,
        failOnCancel: false,
      });
    }

  } catch (downloadError) {
    console.log('Certificate download error:', downloadError);

    Toast.show({
      type: 'error',
      text1: 'Download failed',
      text2: 'Unable to download the course certificate.',
    });
  } finally {
    setLoadingAction(false);
  }
};

  if (loading) {
    return (
      <PrivateLayout title="Certification">
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </PrivateLayout>
    );
  }

  const showEmptyState = selectedStudent && !loadingReport && reportItems.length === 0;
  const showExamList = selectedStudent && !loadingReport && reportItems.length > 0;

  return (
    <PrivateLayout title="Certification">
      <View style={styles.screenContainer}>
        <View style={styles.fixedSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionSubtitle}>Select branch and student to view results</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.label}>Branch</Text>
            <Dropdown
              data={branchOptions}
              labelField="label"
              valueField="value"
              placeholder="Select branch"
              value={selectedBranch}
              onChange={(item) => {
                setSelectedBranch(item.value);
                setSelectedStudent(null);
              }}
              style={[styles.dropdown, !selectedBranch && styles.dropdownActive]}
              selectedTextStyle={styles.selectedText}
              placeholderStyle={styles.placeholder}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Student</Text>
            <Dropdown
              data={studentOptions}
              labelField="label"
              valueField="value"
              placeholder={selectedBranch ? 'Select student' : 'Select branch first'}
              value={selectedStudent}
              onChange={(item) => setSelectedStudent(item.value)}
              style={[styles.dropdown, !selectedBranch && styles.dropdownDisabled]}
              selectedTextStyle={styles.selectedText}
              placeholderStyle={styles.placeholder}
              disable={!selectedBranch}
              search
              searchPlaceholder="Search student"
              maxHeight={320}
            />
            {!selectedBranch ? <Text style={styles.helperText}>Choose a branch to unlock student list.</Text> : null}
          </View>

          {selectedStudentObj ? (
            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <View>
                  <Text style={styles.detailMeta}>Course certificate & exam performance</Text>
                </View>
              </View>

              {reportItems.length > 0 ? (
                <TouchableOpacity
                  style={[styles.downloadBtn, loadingAction && styles.downloadBtnDisabled]}
                  onPress={downloadCertificate}
                  disabled={loadingAction}
                  activeOpacity={0.88}
                >
                  <View style={styles.btnContent}>
                    <MaterialIcons name="download" size={18} color="#FFFFFF" />
                    <Text style={styles.downloadText}>{loadingAction ? 'Downloading...' : 'Download Certificate'}</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <Text style={styles.helperText}>Certificate unlocks after the first exam attempt.</Text>
              )}
            </View>
          ) : null}
        </View>

        {selectedStudent ? (
          <FlatList
            data={showExamList ? reportItems : []}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.listContent}
            style={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View>
                {selectedStudentObj ? (
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryHeader}>
                      <Text style={styles.summaryTitle}>Performance Summary</Text>
                      <Text style={styles.summarySubtitle}>Latest exam insights</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{summary.totalExams}</Text>
                        <Text style={styles.summaryLabel}>Exams</Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{formatPercent(summary.avgPercentage)}</Text>
                        <Text style={styles.summaryLabel}>Avg score</Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{summary.excellentCount}</Text>
                        <Text style={styles.summaryLabel}>Excellent</Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                {loadingReport ? (
                  <View style={styles.loaderWrap}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.loaderText}>Loading exam report...</Text>
                  </View>
                ) : null}

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {showExamList ? (
                  <View style={styles.listWrap}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Exam History</Text>
                      <Text style={styles.sectionSubtitle}>Latest submissions listed first</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            }
            ListEmptyComponent={
              showEmptyState ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No exam report found</Text>
                  <Text style={styles.emptyText}>This student has no submitted exams yet.</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleWrap}>
                    <Text style={styles.topicName}>{item.topicName}</Text>
                    <Text style={styles.examDate}>{formatDate(item.examDate)}</Text>
                  </View>
                  <View style={styles.gradePill}>
                    <Text style={styles.gradeText}>{item.grade}</Text>
                  </View>
                </View>

                <View style={styles.infoGrid}>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Total</Text>
                    <Text style={styles.infoValue}>{item.totalQuestions}</Text>
                  </View>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Correct</Text>
                    <Text style={[styles.infoValue, styles.successText]}>{item.correctQuestions}</Text>
                  </View>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Wrong</Text>
                    <Text style={[styles.infoValue, styles.dangerText]}>{item.wrongQuestions}</Text>
                  </View>
                </View>

                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Score</Text>
                  <Text style={styles.scoreValue}>{formatPercent(item.percentage)}</Text>
                </View>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(item.percentage, 100))}%` }]} />
                </View>

                <Text style={styles.timeText}>
                  Time: {item.startTime || 'N/A'} - {item.endTime || 'N/A'}
                </Text>
              </View>
            )}
          />
        ) : (
          <View style={styles.listPlaceholder} />
        )}
      </View>
    </PrivateLayout>
  );
};

export default CertificationScreen;

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  fixedSection: { padding: 16, paddingBottom: 0 },
  listContainer: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
  listPlaceholder: { flex: 1 },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 10, color: '#64748B', fontSize: 13 },
  sectionHeader: { marginBottom: 10 },
  // sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  sectionSubtitle: { marginTop: 2, color: '#64748B', fontSize: 12, fontWeight: '600' },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  dropdown: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ECEFF3',
  },
  dropdownActive: { borderColor: '#CBD5F5' },
  dropdownDisabled: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
  selectedText: { color: '#111', fontSize: 14 },
  placeholder: { color: '#9AA0A6', fontSize: 14 },
  label: { fontSize: 13, color: '#334155', fontWeight: '700', marginBottom: 8 },
  helperText: { marginTop: 8, color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  detailCard: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailMeta: { color: '#64748B', marginTop: 4, fontSize: 12, fontWeight: '600' },

  downloadBtn: {
    marginTop: 14,
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  downloadBtnDisabled: { backgroundColor: '#86EFAC' },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  downloadText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  summaryCard: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryHeader: { marginBottom: 12 },
  summaryTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  summarySubtitle: { marginTop: 2, fontSize: 12, color: '#64748B', fontWeight: '600' },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryValue: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  summaryLabel: { marginTop: 2, fontSize: 11, fontWeight: '600', color: '#64748B' },
  errorText: { marginTop: 12, color: '#B91C1C', fontSize: 13, fontWeight: '600' },
  emptyState: {
    marginTop: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  emptyText: { textAlign: 'center', color: '#64748B', fontSize: 14 },
  listWrap: { marginTop: 8 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleWrap: { flex: 1, paddingRight: 10 },
  topicName: { color: '#0F172A', fontSize: 15, fontWeight: '800', marginBottom: 2 },
  examDate: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  gradePill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#DBEAFE' },
  gradeText: { color: '#1D4ED8', fontSize: 11, fontWeight: '700' },
  infoGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  infoBox: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  infoLabel: { color: '#64748B', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  infoValue: { color: '#0F172A', fontSize: 15, fontWeight: '800' },
  successText: { color: '#16A34A' },
  dangerText: { color: '#DC2626' },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  scoreLabel: { color: '#334155', fontSize: 12, fontWeight: '700' },
  scoreValue: { color: '#1D4ED8', fontSize: 14, fontWeight: '800' },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: '#E2E8F0', overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: '100%', backgroundColor: '#2563EB' },
  timeText: { color: '#64748B', fontSize: 12, fontWeight: '600' },
});
