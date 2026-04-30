import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import ReactNativeBlobUtil from 'react-native-blob-util';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import Toast from 'react-native-toast-message';
import PrivateLayout from '../../../components/PrivateLayout';
import {
  generateStudentExamReportCertificate,
  getStudentExamReport,
  // getStudentWiseBatchDetails,
  getStudentRegistrationDetails,
} from '../services/studentPortalApi';
import { STUDENT_NAV_ITEMS } from '../shared/studentNavItems';

const getValue = (...values) => values.find((value) => value !== undefined && value !== null);
const safeArray = (value) => (Array.isArray(value) ? value : []);

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (dateValue) => {
  if (!dateValue) {
    return 'N/A';
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleDateString();
};

const formatPercent = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return '0.00%';
  }

  return `${parsed.toFixed(2)}%`;
};

const sanitizeFileName = (value) => String(value || 'Exam_Report').replace(/[^a-z0-9]+/gi, '_');

const StudentExamReportScreen = () => {
  const student = useSelector((state) => state.auth.student);
  const studentId = getValue(student?.StudentId, student?.studentId);
  const studentName = `${student?.StudentName || student?.studentName || 'Student'} ${student?.LastName || student?.lastName || ''}`.trim();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [reports, setReports] = useState([]);
  const [loadingActionKey, setLoadingActionKey] = useState('');

  const resolveRegistrationIds = async () => {
    const directRegistrationId = toNumber(getValue(student?.RegistrationId, student?.registrationId));
    if (directRegistrationId > 0) {
      return [directRegistrationId];
    }

    if (!studentId) {
      return [];
    }

    try {
      const registration = await getStudentRegistrationDetails(studentId);
      if (registration?.registrationId) {
        return [toNumber(registration.registrationId)];
      }
    } catch (error) {
      console.log('Error resolving registration id:', error);
    }

    return [];
  };

  const loadReport = async (showLoader = true) => {
    if (!studentId) {
      setReports([]);
      setLoading(false);
      return;
    }

    if (showLoader) {
      setLoading(true);
    }

    setError('');

    try {
      const registrationIds = await resolveRegistrationIds();

      if (registrationIds.length === 0) {
        setReports([]);
        return;
      }

      const allResponses = await Promise.all(
        registrationIds.map((registrationId) => getStudentExamReport(registrationId)),
      );

      const merged = allResponses.flatMap((response) => safeArray(response));
      const uniqueByExam = [];
      const seen = new Set();

      merged.forEach((exam, index) => {
        const key = String(getValue(exam?.examId, exam?.ExamId, index));
        if (!seen.has(key)) {
          seen.add(key);
          uniqueByExam.push(exam);
        }
      });

      setReports(uniqueByExam);
    } catch (requestError) {
      setError('Unable to load exam report right now. Please try again.');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(true);
  }, [studentId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadReport(false);
    } finally {
      setRefreshing(false);
    }
  };

  const reportItems = useMemo(() => {
    return safeArray(reports)
      .map((item, index) => {
        const totalQuestions = toNumber(getValue(item?.totalQuestions, item?.TotalQuestions));
        const correctQuestions = toNumber(getValue(item?.correctQuestions, item?.CorrectQuestions));
        const wrongQuestions = toNumber(getValue(item?.wrongQuestions, item?.WrongQuestions));
        const percentage = toNumber(getValue(item?.percentage, item?.Percentage));
        const registrationId = toNumber(getValue(item?.registrationId, item?.RegistrationId));

        return {
          id: String(getValue(item?.examId, item?.ExamId, index)),
          registrationId,
          topicName: getValue(item?.topicName, item?.TopicName, 'N/A'),
          examDate: getValue(item?.examDate, item?.ExamDate),
          startTime: getValue(item?.startTime, item?.StartTime, 'N/A'),
          endTime: getValue(item?.endTime, item?.EndTime, 'N/A'),
          totalQuestions,
          correctQuestions,
          wrongQuestions,
          percentage,
          grade: getValue(item?.grade, item?.Grade, 'N/A'),
        };
      })
      .sort((first, second) => {
        const secondDate = new Date(second.examDate || 0).getTime();
        const firstDate = new Date(first.examDate || 0).getTime();
        return secondDate - firstDate;
      });
  }, [reports]);

  const summary = useMemo(() => {
    if (reportItems.length === 0) {
      return {
        totalExams: 0,
        avgPercentage: 0,
        excellentCount: 0,
      };
    }

    const totalPercentage = reportItems.reduce(
      (accumulator, report) => accumulator + toNumber(report.percentage),
      0,
    );

    const excellentCount = reportItems.filter((report) => report.grade === 'Excellent').length;

    return {
      totalExams: reportItems.length,
      avgPercentage: totalPercentage / reportItems.length,
      excellentCount,
    };
  }, [reportItems]);

  const getCertificateBase64 = async (item) => {
    if (!item?.registrationId) {
      throw new Error('Registration id missing');
    }

    const response = await generateStudentExamReportCertificate(item.registrationId);
    return typeof response === 'string' ? response : '';
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const downloadCertificate = async (item) => {
    const actionKey = `${item.id}:download`;
    setLoadingActionKey(actionKey);

    try {
      // 🔹 STEP 1: Immediate feedback
      Toast.show({
        type: 'info',
        text1: 'Preparing certificate...',
        text2: 'Please wait while we generate your PDF',
      });

      const base64 = await getCertificateBase64(item);
      if (!base64) {
        throw new Error('Certificate payload missing');
      }

      const fileName = `${sanitizeFileName(
        `${studentName}_${item.topicName}_Result_Certificate_${item.id}`
      )}.pdf`;

      let filePath = '';

      // 🔹 STEP 2: Download
      if (Platform.OS === 'android') {
        const dirs = ReactNativeBlobUtil.fs.dirs;
        filePath = `${dirs.DownloadDir}/${fileName}`;

        await ReactNativeBlobUtil.fs.writeFile(filePath, base64, 'base64');
        await ReactNativeBlobUtil.fs.scanFile([{ path: filePath, mime: 'application/pdf' }]);

        await ReactNativeBlobUtil.android.addCompleteDownload({
          title: fileName,
          description: 'Exam Report Certificate',
          mime: 'application/pdf',
          path: filePath,
          showNotification: true,
        });
      } else {
        filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
        await RNFS.writeFile(filePath, base64, 'base64');
      }

      // 🔹 STEP 3: Success feedback BEFORE opening
      Toast.show({
        type: 'success',
        text1: 'Download Complete',
        text2: 'Opening your certificate...',
      });

      // 🔹 STEP 4: Smooth delay
      await sleep(500);

      // 🔹 STEP 5: Open
      if (Platform.OS === 'android') {
        await ReactNativeBlobUtil.android.actionViewIntent(filePath, 'application/pdf');
      } else {
        await Share.open({
          url: `file://${filePath}`,
          type: 'application/pdf',
          filename: fileName,
          failOnCancel: false,
        });
      }

    } catch (downloadError) {
      console.log('Certificate download/open error:', downloadError);

      Toast.show({
        type: 'error',
        text1: 'Download failed',
        text2: 'Unable to download/open the certificate.',
      });
    } finally {
      setLoadingActionKey('');
    }
  };


  const shareCertificate = async (item) => {
    const actionKey = `${item.id}:share`;
    setLoadingActionKey(actionKey);

    try {
      // 🔹 STEP 1: Immediate feedback
      Toast.show({
        type: 'info',
        text1: 'Preparing certificate...',
        text2: 'Please wait while we generate your PDF',
      });

      const base64 = await getCertificateBase64(item);
      if (!base64) {
        throw new Error('Certificate payload missing');
      }

      const fileName = `${sanitizeFileName(
        `${studentName}_${item.topicName}_Result_Certificate_${item.id}`
      )}.pdf`;

      const path = `${RNFS.CachesDirectoryPath}/${fileName}`;

      // 🔹 STEP 2: Write file
      await RNFS.writeFile(path, base64, 'base64');

      // 🔹 STEP 3: Success feedback
      Toast.show({
        type: 'success',
        text1: 'Ready to Share',
        text2: 'Opening share options...',
      });

      // 🔹 STEP 4: Smooth delay
      await sleep(500);

      // 🔹 STEP 5: Open share sheet
      await Share.open({
        url: `file://${path}`,
        type: 'application/pdf',
        filename: fileName,
        failOnCancel: false,
        useInternalStorage: true,
      });

    } catch (shareError) {
      console.log('Certificate share error:', shareError);

      Toast.show({
        type: 'error',
        text1: 'Share failed',
        text2: 'Unable to share the result certificate.',
      });
    } finally {
      setLoadingActionKey('');
    }
  };
  if (loading) {
    return (
      <PrivateLayout title="Exam Report" navItems={STUDENT_NAV_ITEMS}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loaderText}>Preparing your exam report...</Text>
        </View>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout title="Exam Report" navItems={STUDENT_NAV_ITEMS}>
      <View style={styles.container}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.totalExams}</Text>
            <Text style={styles.summaryLabel}>Total Exams</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{formatPercent(summary.avgPercentage)}</Text>
            <Text style={styles.summaryLabel}>Average Score</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.excellentCount}</Text>
            <Text style={styles.summaryLabel}>Excellent</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>We ran into a problem</Text>
            <Text style={styles.alertText}>{error}</Text>
          </View>
        ) : null}

        {reportItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No exam report found</Text>
            <Text style={styles.emptyText}>
              Once you submit exams, your performance report will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={reportItems}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
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

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[
                      styles.downloadBtn,
                      loadingActionKey === `${item.id}:download` && { opacity: 0.7 }
                    ]}
                    onPress={() => downloadCertificate(item)}
                    disabled={loadingActionKey === `${item.id}:download`}
                    activeOpacity={0.88}
                  >
                    <View style={styles.btnContent}>
                      {loadingActionKey === `${item.id}:download` ? (
                        <>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.downloadText}> Preparing...</Text>
                        </>
                      ) : (
                        <>
                          <MaterialIcons name="download" size={18} color="#FFFFFF" />
                          <Text style={styles.downloadText}> Download</Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.shareBtn,
                      loadingActionKey === `${item.id}:share` && { opacity: 0.7 }
                    ]}
                    onPress={() => shareCertificate(item)}
                    disabled={loadingActionKey === `${item.id}:share`}
                    activeOpacity={0.88}
                  >
                    <View style={styles.btnContent}>
                      {loadingActionKey === `${item.id}:share` ? (
                        <>
                          <ActivityIndicator size="small" color="#2563EB" />
                          <Text style={styles.shareText}> Preparing...</Text>
                        </>
                      ) : (
                        <>
                          <MaterialIcons name="share" size={18} color="#2563EB" />
                          <Text style={styles.shareText}> Share</Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </PrivateLayout>
  );
};

export default StudentExamReportScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loaderText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  summaryValue: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  summaryLabel: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  alertBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 13,
    color: '#B91C1C',
  },
  emptyState: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 14,
  },
  listContent: {
    paddingTop: 2,
    paddingBottom: 20,
  },
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
  cardTitleWrap: {
    flex: 1,
    paddingRight: 10,
  },
  topicName: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  examDate: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  gradePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#DBEAFE',
  },
  gradeText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '700',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  infoBox: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  successText: {
    color: '#16A34A',
  },
  dangerText: {
    color: '#DC2626',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  scoreValue: {
    color: '#1D4ED8',
    fontSize: 14,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
  },
  timeText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  downloadBtn: {
    flex: 1,
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  shareBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  downloadText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  shareText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
});
