import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import PrivateLayout from '../../../components/PrivateLayout';
import { getStudentDetailsById } from '../services/studentPortalApi';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import axiosClient from '../../../api/axiosClient';
import { TouchableOpacity, Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import Toast from 'react-native-toast-message';
import { STUDENT_NAV_ITEMS } from '../shared/studentNavItems';

const getValue = (...values) => values.find((value) => value !== undefined && value !== null);
const safeArray = (value) => (Array.isArray(value) ? value : []);

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value) => {
  const amount = toNumber(value);
  return `₹ ${amount.toLocaleString('en-IN')}`;
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

const getStatusConfig = (dueFee, status) => {
  const normalizedStatus = String(status || '').toLowerCase();

  if (dueFee <= 0) {
    return {
      label: 'Paid',
      bgColor: '#DCFCE7',
      textColor: '#166534',
      progressColor: '#16A34A',
    };
  }

  if (normalizedStatus.includes('cancel')) {
    return {
      label: 'Cancelled',
      bgColor: '#FEE2E2',
      textColor: '#991B1B',
      progressColor: '#DC2626',
    };
  }

  return {
    label: 'Pending',
    bgColor: '#FEF3C7',
    textColor: '#92400E',
    progressColor: '#D97706',
  };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const StudentFeeDetailsScreen = () => {
  const student = useSelector((state) => state.auth.student);
  const studentId = student?.StudentId || student?.studentId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [loadingState, setLoadingState] = useState({
    id: null,
    type: null, // 'download' | 'share'
  });

  const loadFeeData = async (showLoader = true) => {
    if (!studentId) {
      setRegistrations([]);
      setLoading(false);
      return;
    }

    if (showLoader) {
      setLoading(true);
    }

    setError('');

    try {
      const studentDetails = await getStudentDetailsById(studentId);
      const studentRegistrations = safeArray(
        getValue(studentDetails?.registrations, studentDetails?.Registrations),
      );
      setRegistrations(studentRegistrations);
    } catch (requestError) {
      setError('Unable to load fee details right now.');
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeeData(true);
  }, [studentId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadFeeData(false);
    } finally {
      setRefreshing(false);
    }
  };

  const feeItems = useMemo(() => {
    return registrations.map((registration, index) => {
      const payments = safeArray(getValue(registration?.payments, registration?.Payments));
      const fee = getValue(registration?.courseFee, registration?.CourseFee);
      const course = getValue(fee?.course, fee?.Course);

      const totalFee = toNumber(
        getValue(
          fee?.feesAmount,
          fee?.FeesAmount,
          registration?.feeAmount,
          registration?.FeeAmount,
          registration?.courseFeeAmount,
          registration?.CourseFeeAmount,
        ),
      );
      const discount = toNumber(getValue(registration?.discount, registration?.Discount, 0));
      const paidFee = payments.reduce((sum, payment) => {
        const paymentAmount = getValue(payment?.paymentAmount, payment?.PaymentAmount);
        return sum + toNumber(paymentAmount);
      }, 0);
      const payableFee = Math.max(totalFee - discount, 0);
      const dueFee = Math.max(payableFee - paidFee, 0);
      const feeMode = getValue(
        registration?.feeMode,
        registration?.FeeMode,
        fee?.feeMode,
        fee?.FeeMode,
        payments[0]?.paymentMode,
        payments[0]?.PaymentMode,
        'N/A',
      );
      const paymentProgress = payableFee > 0 ? Math.min((paidFee / payableFee) * 100, 100) : 100;
      const status = getValue(registration?.currentStatus, registration?.CurrentStatus, 'N/A');
      const statusConfig = getStatusConfig(dueFee, status);

      return {
        id: String(getValue(registration?.registrationId, registration?.RegistrationId, index)),
        courseName: getValue(course?.courseName, course?.CourseName, 'N/A'),
        registrationDate: getValue(registration?.registrationDate, registration?.RegistrationDate),
        totalFee,
        discount,
        payableFee,
        paidFee,
        dueFee,
        feeMode,
        status,
        statusConfig,
        paymentProgress,
        payments: payments

      };
    }).sort((first, second) => {
      const firstDate = new Date(first.registrationDate || 0).getTime();
      const secondDate = new Date(second.registrationDate || 0).getTime();
      return secondDate - firstDate;
    });
  }, [registrations]);

  const downloadPDF = async (item, base64) => {
    try {
      const fileName = `${item.courseName}_Invoice_${Date.now()}.pdf`;
      let filePath = '';

      if (Platform.OS === 'android') {
        const dirs = ReactNativeBlobUtil.fs.dirs;
        filePath = `${dirs.DownloadDir}/${fileName}`;

        await ReactNativeBlobUtil.fs.writeFile(filePath, base64, 'base64');
        await ReactNativeBlobUtil.fs.scanFile([{ path: filePath, mime: 'application/pdf' }]);

        await ReactNativeBlobUtil.android.addCompleteDownload({
          title: fileName,
          description: 'Course Fee Invoice',
          mime: 'application/pdf',
          path: filePath,
          showNotification: true,
        });

        return { filePath, fileName };
      }

      // iOS fallback
      filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      await RNFS.writeFile(filePath, base64, 'base64');
      return { filePath, fileName };
    } catch (error) {
      console.log('Download error:', error);
      throw error;
    }
  };

  const getPDFBase64 = async (item) => {
    const response = await axiosClient.post(
      '/course-fees/generate-fee-invoice',
      {
        studentName: student?.studentName || 'N/A',
        courseName: item.courseName,
        registrationDate: formatDate(item.registrationDate),
        status: item.status,
        feeMode: item.feeMode,
        totalFee: item.totalFee,
        discount: item.discount,
        payableFee: item.payableFee,
        paidFee: item.paidFee,
        dueFee: item.dueFee,
        payments: (item.payments || []).map(p => ({
          paymentDate: formatDate(p.paymentDate || p.PaymentDate),
          paymentMode: p.paymentMode || p.PaymentMode || 'N/A',
          amount: p.paymentAmount || p.PaymentAmount || 0
        }))
      }
    );

    return response.data;
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const sharePDF = async (item) => {
    try {
      // 🔹 STEP 1: Immediate feedback
      Toast.show({
        type: 'info',
        text1: 'Preparing file...',
        text2: 'Please wait a moment',
      });

      const base64 = await getPDFBase64(item);

      if (!base64) {
        throw new Error('Invalid PDF data');
      }

      const fileName = `${item.courseName}_${Date.now()}.pdf`;
      const path = `${RNFS.CachesDirectoryPath}/${fileName}`;

      // 🔹 STEP 2: Write file
      await RNFS.writeFile(path, base64, 'base64');

      // 🔹 STEP 3: Success feedback
      Toast.show({
        type: 'success',
        text1: 'Ready to Share',
        text2: 'Opening share options...',
      });

      // 🔹 STEP 4: Smooth delay (natural feel)
      await sleep(500);

      // 🔹 STEP 5: Open share sheet
      await Share.open({
        url: 'file://' + path,
        type: 'application/pdf',
        filename: fileName,
        failOnCancel: false,
        useInternalStorage: true,
      });

    } catch (error) {
      console.log('Share Error:', error);

      Toast.show({
        type: 'error',
        text1: 'Share failed',
        text2: 'Something went wrong while preparing file',
      });
    }
  };

  const downloadPDFHandler = async (item) => {
    try {
      // 🔹 STEP 1: Immediate feedback
      Toast.show({
        type: 'info',
        text1: 'Preparing invoice...',
        text2: 'Please wait while we generate your PDF',
      });

      const base64 = await getPDFBase64(item);

      if (!base64) {
        throw new Error('Invalid PDF data');
      }

      // 🔹 STEP 2: Download file
      const { filePath, fileName } = await downloadPDF(item, base64);

      // 🔹 STEP 3: Success feedback
      Toast.show({
        type: 'success',
        text1: 'Download Complete',
        text2: 'Opening your invoice...',
      });

      // 🔹 STEP 4: Smooth delay
      await sleep(500);

      // 🔹 STEP 5: Open file
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

    } catch (error) {
      console.log('Download/Open error:', error);

      Toast.show({
        type: 'error',
        text1: 'Download failed',
        text2: 'Unable to download or open PDF',
      });
    }
  };

  if (loading) {
    return (
      <PrivateLayout title="My Courses" navItems={STUDENT_NAV_ITEMS}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout title="My Courses" navItems={STUDENT_NAV_ITEMS}>
      <View style={styles.container}>
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Couldn’t load fee details</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!studentId ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Student profile not available</Text>
            <Text style={styles.emptyText}>Please log in again to load your course fee details.</Text>
          </View>
        ) : feeItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No fee records found</Text>
            <Text style={styles.emptyText}>No registrations are linked to this student yet.</Text>
          </View>
        ) : (
          <FlatList
            data={feeItems}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.title}>{item.courseName}</Text>
                    <Text style={styles.metaMuted}>Registered on {formatDate(item.registrationDate)}</Text>
                  </View>

                  <View style={[styles.chip, { backgroundColor: item.statusConfig.bgColor }]}>
                    <Text style={[styles.chipText, { color: item.statusConfig.textColor }]}>
                      {item.statusConfig.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${item.paymentProgress}%`,
                        backgroundColor: item.statusConfig.progressColor,
                      },
                    ]}
                  />
                </View>

                <View style={styles.rowBetween}>
                  <Text style={styles.metaLabel}>Fee Mode</Text>
                  <Text style={styles.metaValue}>{item.feeMode}</Text>
                </View>

                <View style={styles.rowBetween}>
                  <Text style={styles.metaLabel}>Current Status</Text>
                  <Text style={styles.metaValue}>{item.status}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.amountSection}>

                  {/* Row 1 */}
                  <View style={styles.amountRow}>
                    <View style={styles.amountItem}>
                      <Text style={styles.amountLabel}>Total</Text>
                      <Text style={styles.amountValue}>{formatCurrency(item.totalFee)}</Text>
                    </View>

                    <View style={[styles.amountItem, styles.amountItemRight]}>
                      <Text style={styles.amountLabel}>Discount</Text>
                      <Text style={styles.amountValue}>{formatCurrency(item.discount)}</Text>
                    </View>
                  </View>

                  {/* Row 2 */}
                  <View style={styles.amountRow}>
                    <View style={styles.amountItem}>
                      <Text style={styles.amountLabel}>Payable</Text>
                      <Text style={styles.amountValue}>{formatCurrency(item.payableFee)}</Text>
                    </View>

                    <View style={[styles.amountItem, styles.amountItemRight]}>
                      <Text style={styles.amountLabel}>Paid</Text>
                      <Text style={[styles.amountValue, styles.metricPaid]}>
                        {formatCurrency(item.paidFee)}
                      </Text>
                    </View>
                  </View>

                </View>
                <View style={styles.heroDue}>
                  <Text style={styles.heroAmount}>{formatCurrency(item.dueFee)}</Text>
                  <Text style={styles.heroLabel}>Outstanding Due</Text>
                </View>
                <View style={styles.actionRow}>

                  {/* Download - Primary */}
                  <TouchableOpacity
                    style={[
                      styles.downloadBtn,
                      loadingState.id === item.id && loadingState.type === 'download' && { opacity: 0.7 }
                    ]}
                    onPress={async () => {
                      setLoadingState({ id: item.id, type: 'download' });
                      await downloadPDFHandler(item);
                      setLoadingState({ id: null, type: null });
                    }}
                    disabled={loadingState.id === item.id && loadingState.type === 'download'}
                  >
                    <View style={styles.btnContent}>
                      {loadingState.id === item.id && loadingState.type === 'download' ? (
                        <>
                          <ActivityIndicator size="small" color="#fff" />
                          <Text style={styles.downloadText}> Preparing...</Text>
                        </>
                      ) : (
                        <>
                          <MaterialIcons name="download" size={18} color="#fff" />
                          <Text style={styles.downloadText}> Download</Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Share - Secondary */}
                  <TouchableOpacity
                    style={[
                      styles.shareBtn,
                      loadingState.id === item.id && loadingState.type === 'share' && { opacity: 0.7 }
                    ]}
                    onPress={async () => {
                      setLoadingState({ id: item.id, type: 'share' });
                      await sharePDF(item);
                      setLoadingState({ id: null, type: null });
                    }}
                    disabled={loadingState.id === item.id && loadingState.type === 'share'}
                  >
                    <View style={styles.btnContent}>
                      {loadingState.id === item.id && loadingState.type === 'share' ? (
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

export default StudentFeeDetailsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  cardHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },

  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },

  metaMuted: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },

  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },

  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },

  progressFill: {
    height: '100%',
    borderRadius: 999,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  metaLabel: {
    fontSize: 13,
    color: '#64748B',
  },

  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },

  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },

  amountSection: {
    marginTop: 6,
  },

  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  amountItem: {
    flex: 1,
  },

  amountItemRight: {
    alignItems: 'flex-end',
  },

  amountLabel: {
    fontSize: 12,
    color: '#64748B',
  },

  amountValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },

  metricPaid: {
    color: '#166534',
  },

  heroDue: {
    alignItems: 'center',
    marginVertical: 12,
  },

  heroAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#DC2626',
  },

  heroLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
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
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  shareText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    marginTop: 8,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },

  emptyText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
  },

  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    marginBottom: 10,
  },

  errorTitle: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },

  errorText: {
    color: '#B91C1C',
    fontSize: 13,
  },
});