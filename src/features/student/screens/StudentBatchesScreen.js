import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import PrivateLayout from '../../../components/PrivateLayout';
import { getStudentBatchAttendance, getStudentWiseBatchDetails } from '../services/studentPortalApi';
import { STUDENT_NAV_ITEMS } from '../shared/studentNavItems';

const getValue = (...values) => values.find((value) => value !== undefined && value !== null);
const safeArray = (value) => (Array.isArray(value) ? value : []);

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

const toReadableStatus = (value) => {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  if (typeof value === 'boolean') {
    return value ? 'Present' : 'Absent';
  }

  if (typeof value === 'number') {
    return value === 1 ? 'Present' : 'Absent';
  }

  const text = String(value).trim();
  if (text === '1') {
    return 'Present';
  }
  if (text === '0') {
    return 'Absent';
  }
  return text.length > 0 ? text : 'N/A';
};

const StudentBatchesScreen = () => {
  const student = useSelector((state) => state.auth.student);
  const studentId = student?.StudentId || student?.studentId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [batches, setBatches] = useState([]);
  const [expandedBatchId, setExpandedBatchId] = useState(null);
  const [attendanceByBatchId, setAttendanceByBatchId] = useState({});
  const [attendanceLoading, setAttendanceLoading] = useState({});
  const [attendanceError, setAttendanceError] = useState({});

  const loadBatches = async (showLoader = true) => {
    if (!studentId) {
      setBatches([]);
      setLoading(false);
      return;
    }

    if (showLoader) {
      setLoading(true);
    }

    setError('');

    try {
      const response = await getStudentWiseBatchDetails(studentId);
      setBatches(safeArray(response));
    } catch (requestError) {
      setError('Unable to load batches right now.');
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches(true);
  }, [studentId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadBatches(false);
    } finally {
      setRefreshing(false);
    }
  };

  const loadAttendance = async (batchId, registrationId) => {
    if (!batchId || !registrationId) {
      return;
    }

    setAttendanceLoading((prev) => ({ ...prev, [batchId]: true }));
    setAttendanceError((prev) => ({ ...prev, [batchId]: '' }));

    try {
      const response = await getStudentBatchAttendance(batchId, registrationId);
      setAttendanceByBatchId((prev) => ({
        ...prev,
        [batchId]: safeArray(response),
      }));
    } catch (requestError) {
      setAttendanceByBatchId((prev) => ({ ...prev, [batchId]: [] }));
      setAttendanceError((prev) => ({
        ...prev,
        [batchId]: 'Unable to load attendance right now.',
      }));
    } finally {
      setAttendanceLoading((prev) => ({ ...prev, [batchId]: false }));
    }
  };

  const batchItems = useMemo(() => {
    return safeArray(batches).map((batch, index) => ({
      id: String(getValue(batch?.batchStudentId, batch?.BatchStudentId, index)),
      batchId: getValue(batch?.batchId, batch?.BatchId),
      registrationId: getValue(batch?.registrationId, batch?.RegistrationId),
      batchName: getValue(batch?.batchName, batch?.BatchName, 'N/A'),
      batchTime: getValue(batch?.batchTime, batch?.BatchTime, 'N/A'),
      courseName: getValue(batch?.courseName, batch?.CourseName, 'N/A'),
      topicName: getValue(batch?.topicName, batch?.TopicName, 'N/A'),
      employeeName: getValue(batch?.employeeName, batch?.EmployeeName, 'N/A'),
      startDate: getValue(batch?.startDate, batch?.StartDate),
      registrationDate: getValue(batch?.registrationDate, batch?.RegistrationDate),
    }));
  }, [batches]);

  if (loading) {
    return (
      <PrivateLayout title="My Batches" navItems={STUDENT_NAV_ITEMS}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loaderText}>Fetching your batches...</Text>
        </View>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout title="My Batches" navItems={STUDENT_NAV_ITEMS}>
      <View style={styles.container}>
        {error ? (
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>We ran into a problem</Text>
            <Text style={styles.alertText}>{error}</Text>
          </View>
        ) : null}

        {!studentId ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Student profile not available</Text>
            <Text style={styles.emptyText}>Please sign in again to load your batches.</Text>
          </View>
        ) : batchItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No batches found</Text>
            <Text style={styles.emptyText}>You will see your batches here once assigned.</Text>
          </View>
        ) : (
          <FlatList
            data={batchItems}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isExpanded = expandedBatchId === item.batchId;
              const attendance = attendanceByBatchId[item.batchId] || [];
              const isLoadingAttendance = Boolean(attendanceLoading[item.batchId]);
              const attendanceErrorText = attendanceError[item.batchId] || '';

              const totalSessions = attendance.length;
              const presentSessions = attendance.reduce((count, record) => {
                const statusValue = getValue(
                  record?.attendance,
                  record?.Attendance,
                  record?.status,
                  record?.Status,
                  record?.isPresent,
                  record?.IsPresent,
                );
                return toReadableStatus(statusValue) === 'Present' ? count + 1 : count;
              }, 0);
              const progressRatio = totalSessions > 0 ? presentSessions / totalSessions : 0;

              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <Text style={styles.title}>{item.batchName}</Text>
                      <Text style={styles.subtitle}>{item.courseName}</Text>
                    </View>
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>{item.batchTime}</Text>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <View style={styles.infoBlock}>
                      <Text style={styles.infoLabel}>Topic</Text>
                      <Text style={styles.infoValue}>{item.topicName}</Text>
                    </View>
                    <View style={styles.infoBlock}>
                      <Text style={styles.infoLabel}>Trainer</Text>
                      <Text style={styles.infoValue}>{item.employeeName}</Text>
                    </View>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaSmall}>Start: {formatDate(item.startDate)}</Text>
                    <Text style={styles.metaSmall}>Registered: {formatDate(item.registrationDate)}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.actionButton, isExpanded ? styles.actionButtonActive : null]}
                    onPress={() => {
                      const nextExpanded = isExpanded ? null : item.batchId;
                      setExpandedBatchId(nextExpanded);
                      if (!isExpanded && item.batchId && item.registrationId) {
                        const existing = attendanceByBatchId[item.batchId];
                        if (!existing || existing.length === 0) {
                          loadAttendance(item.batchId, item.registrationId);
                        }
                      }
                    }}
                  >
                    <Text style={styles.actionButtonText}>
                      {isExpanded ? 'Hide Attendance' : 'View Attendance'}
                    </Text>
                  </TouchableOpacity>

                  {isExpanded ? (
                    <View style={styles.attendanceCard}>
                      <View style={styles.attendanceHeader}>
                        <Text style={styles.attendanceTitle}>Attendance</Text>
                        <Text style={styles.attendanceCount}>{attendance.length} sessions</Text>
                      </View>

                      {!isLoadingAttendance && !attendanceErrorText && totalSessions > 0 ? (
                        <View style={styles.progressWrap}>
                          <View style={styles.progressMeta}>
                            <Text style={styles.progressLabel}>Present</Text>
                            <Text style={styles.progressValue}>
                              {presentSessions}/{totalSessions}
                            </Text>
                          </View>
                          <View style={styles.progressTrack}>
                            <View
                              style={[
                                styles.progressFill,
                                { width: `${Math.round(progressRatio * 100)}%` },
                              ]}
                            />
                          </View>
                        </View>
                      ) : null}

                      {isLoadingAttendance ? (
                        <View style={styles.attendanceLoader}>
                          <ActivityIndicator size="small" color="#2563EB" />
                          <Text style={styles.attendanceLoadingText}>Loading attendance...</Text>
                        </View>
                      ) : attendanceErrorText ? (
                        <Text style={styles.attendanceError}>{attendanceErrorText}</Text>
                      ) : attendance.length === 0 ? (
                        <Text style={styles.attendanceEmpty}>No attendance marked yet.</Text>
                      ) : (
                        attendance.map((record, index) => {
                          const recordId = String(
                            getValue(record?.id, record?.attendanceId, record?.AttendanceId, index),
                          );
                          const recordDate = getValue(
                            record?.attendanceDate,
                            record?.AttendanceDate,
                            record?.date,
                            record?.Date,
                          );
                          const recordStatus = getValue(
                            record?.status,
                            record?.Status,
                            record?.isPresent,
                            record?.IsPresent,
                          );
                          const recordRemark = getValue(
                            record?.remark,
                            record?.remarks,
                            record?.Remark,
                            record?.Remarks,
                          );

                          return (
                            <View key={recordId} style={styles.attendanceRow}>
                              <View style={styles.attendanceRowHeader}>
                                <Text style={styles.attendanceDate}>{formatDate(recordDate)}</Text>
                                <View
                                  style={[
                                    styles.statusBadge,
                                    toReadableStatus(recordStatus) === 'Present'
                                      ? styles.statusSuccess
                                      : styles.statusDanger,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.statusText,
                                      toReadableStatus(recordStatus) === 'Present'
                                        ? styles.statusTextSuccess
                                        : styles.statusTextDanger,
                                    ]}
                                  >
                                    {toReadableStatus(recordStatus)}
                                  </Text>
                                </View>
                              </View>
                              {recordRemark ? (
                                <Text style={styles.attendanceRemark}>{recordRemark}</Text>
                              ) : null}
                            </View>
                          );
                        })
                      )}
                    </View>
                  ) : null}
                </View>
              );
            }}
          />
        )}
      </View>
    </PrivateLayout>
  );
};

export default StudentBatchesScreen;

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
  listContent: {
    paddingBottom: 20,
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
  },
  pill: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: 8,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 120, 
    alignItems: 'flex-start',
  },
  infoBlock: {
    flex: 1,
    paddingRight: 10,
    minWidth: 0,
  },
  infoLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  metaSmall: {
    fontSize: 12,
    color: '#64748B',
  },
  actionButton: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#1D4ED8',
  },
  actionButtonActive: {
    backgroundColor: '#1E40AF',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  attendanceCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  attendanceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  attendanceCount: {
    fontSize: 12,
    color: '#64748B',
  },
  attendanceLoader: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  attendanceLoadingText: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748B',
  },
  attendanceError: {
    color: '#DC2626',
    fontSize: 12,
    textAlign: 'center',
  },
  attendanceEmpty: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
  },
  attendanceRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  attendanceRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceDate: {
    color: '#0F172A',
    fontWeight: '600',
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusSuccess: {
    backgroundColor: '#DCFCE7',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextSuccess: {
    color: '#166534',
  },
  statusDanger: {
    backgroundColor: '#FEE2E2',
  },
  statusTextDanger: {
    color: '#B91C1C',
  },
  attendanceRemark: {
    marginTop: 4,
    color: '#475569',
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 14,
  },
  progressWrap: {
    marginBottom: 12,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#16A34A',
  },
});
