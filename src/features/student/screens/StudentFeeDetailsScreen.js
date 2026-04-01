import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import PrivateLayout from '../../../components/PrivateLayout';
import { getStudentDetailsById } from '../services/studentPortalApi';

const STUDENT_NAV_ITEMS = [
  { label: 'Dashboard', routeName: 'StudentDashboard', icon: 'dashboard' },
//   { label: 'Course List', routeName: 'StudentCourses', icon: 'menu-book' },
  { label: 'My Batches', routeName: 'StudentBatches', icon: 'groups' },
  { label: 'Course Fee Details', routeName: 'StudentFeeDetails', icon: 'account-balance-wallet' },
];

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

const StudentFeeDetailsScreen = () => {
  const student = useSelector((state) => state.auth.student);
  const studentId = student?.StudentId || student?.studentId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [registrations, setRegistrations] = useState([]);

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
      };
    }).sort((first, second) => {
      const firstDate = new Date(first.registrationDate || 0).getTime();
      const secondDate = new Date(second.registrationDate || 0).getTime();
      return secondDate - firstDate;
    });
  }, [registrations]);

//   const totals = useMemo(() => {
//     return feeItems.reduce(
//       (accumulator, item) => {
//         accumulator.totalFee += item.totalFee;
//         accumulator.totalDiscount += item.discount;
//         accumulator.totalPayable += item.payableFee;
//         accumulator.totalPaid += item.paidFee;
//         accumulator.totalDue += item.dueFee;
//         return accumulator;
//       },
//       {
//         totalFee: 0,
//         totalDiscount: 0,
//         totalPayable: 0,
//         totalPaid: 0,
//         totalDue: 0,
//       },
//     );
//   }, [feeItems]);

  if (loading) {
    return (
      <PrivateLayout title="Course Fee Details" navItems={STUDENT_NAV_ITEMS}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout title="Course Fee Details" navItems={STUDENT_NAV_ITEMS}>
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
            // ListHeaderComponent={
            //   <View style={styles.summaryCard}>
            //     <View style={styles.summaryHeaderRow}>
            //       <Text style={styles.summaryTitle}>Fee Overview</Text>
            //       <View style={[styles.chip, totals.totalDue <= 0 ? styles.chipSuccess : styles.chipWarning]}>
            //         <Text style={[styles.chipText, totals.totalDue <= 0 ? styles.chipSuccessText : styles.chipWarningText]}>
            //           {totals.totalDue <= 0 ? 'All Clear' : 'Due Pending'}
            //         </Text>
            //       </View>
            //     </View>

            //     <View style={styles.metricGrid}>
            //       <View style={styles.metricTile}>
            //         <Text style={styles.metricLabel}>Total Fee</Text>
            //         <Text style={styles.metricValue}>{formatCurrency(totals.totalFee)}</Text>
            //       </View>

            //       <View style={styles.metricTile}>
            //         <Text style={styles.metricLabel}>Discount</Text>
            //         <Text style={styles.metricValue}>{formatCurrency(totals.totalDiscount)}</Text>
            //       </View>

            //       <View style={styles.metricTile}>
            //         <Text style={styles.metricLabel}>Paid</Text>
            //         <Text style={[styles.metricValue, styles.metricPaid]}>{formatCurrency(totals.totalPaid)}</Text>
            //       </View>

            //       <View style={styles.metricTile}>
            //         <Text style={styles.metricLabel}>Due</Text>
            //         <Text style={[styles.metricValue, styles.metricDue]}>{formatCurrency(totals.totalDue)}</Text>
            //       </View>
            //     </View>
            //   </View>
            // }
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

                <View style={styles.amountGrid}>
                  <View style={styles.amountTile}>
                    <Text style={styles.amountLabel}>Total</Text>
                    <Text style={styles.amountValue}>{formatCurrency(item.totalFee)}</Text>
                  </View>

                  <View style={styles.amountTile}>
                    <Text style={styles.amountLabel}>Discount</Text>
                    <Text style={styles.amountValue}>{formatCurrency(item.discount)}</Text>
                  </View>

                  <View style={styles.amountTile}>
                    <Text style={styles.amountLabel}>Payable</Text>
                    <Text style={styles.amountValue}>{formatCurrency(item.payableFee)}</Text>
                  </View>

                  <View style={styles.amountTile}>
                    <Text style={styles.amountLabel}>Paid</Text>
                    <Text style={[styles.amountValue, styles.metricPaid]}>{formatCurrency(item.paidFee)}</Text>
                  </View>
                </View>

                <View style={styles.dueBanner}>
                  <Text style={styles.dueLabel}>Outstanding Due</Text>
                  <Text style={styles.dueValue}>{formatCurrency(item.dueFee)}</Text>
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
//   summaryCard: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 16,
//     borderWidth: 1,
//     borderColor: '#E2E8F0',
//     padding: 14,
//     marginBottom: 12,
//   },
//   summaryHeaderRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   summaryTitle: {
//     fontSize: 16,
//     fontWeight: '700',
//     color: '#0F172A',
//   },
//   metricGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     marginHorizontal: -4,
//   },
//   metricTile: {
//     width: '50%',
//     paddingHorizontal: 4,
//     paddingVertical: 4,
//   },
//   metricLabel: {
//     fontSize: 12,
//     color: '#64748B',
//     marginBottom: 4,
//   },
//   metricValue: {
//     fontSize: 15,
//     fontWeight: '700',
//     color: '#0F172A',
//   },
  metricPaid: {
    color: '#166534',
  },
  metricDue: {
    color: '#B91C1C',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
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
//   chipSuccess: {
//     backgroundColor: '#DCFCE7',
//   },
//   chipSuccessText: {
//     color: '#166534',
//   },
//   chipWarning: {
//     backgroundColor: '#FEF3C7',
//   },
//   chipWarningText: {
//     color: '#92400E',
//   },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  amountTile: {
    width: '50%',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  amountLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  dueBanner: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7F1D1D',
  },
  dueValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B91C1C',
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
