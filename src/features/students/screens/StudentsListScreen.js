import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Modal from 'react-native-modal';
import { Dropdown } from 'react-native-element-dropdown';
import PrivateLayout from '../../../components/PrivateLayout';
import { getAllStudents, getBranches } from '../services/studentApi';

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

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeStudent = (student) => {
  const registrationsRaw = safeArray(getValue(student.registrations, student.Registrations));
  const qualifications = safeArray(getValue(student.qualifications, student.Qualifications));

  const registrations = registrationsRaw
    .map((registration) => {
      const payments = safeArray(getValue(registration.payments, registration.Payments));
      const fee = getValue(registration.courseFee, registration.CourseFee);
      const course = fee ? getValue(fee.course, fee.Course) : null;

      const totalPaid = payments.reduce((sum, payment) => {
        const paymentAmount = getValue(payment.paymentAmount, payment.PaymentAmount);
        return sum + toNumber(paymentAmount);
      }, 0);

      return {
        registrationId: getValue(registration.registrationId, registration.RegistrationId),
        registrationDate: getValue(registration.registrationDate, registration.RegistrationDate),
        currentStatus: getValue(registration.currentStatus, registration.CurrentStatus, 'N/A'),
        discount: getValue(registration.discount, registration.Discount, 0),
        courseName: course
          ? getValue(course.courseName, course.CourseName, 'N/A')
          : 'N/A',
        feeAmount: fee ? getValue(fee.feesAmount, fee.FeesAmount, 0) : 0,
        payments,
        totalPaid,
      };
    })
    .sort((first, second) => {
      const firstDate = new Date(first.registrationDate || 0).getTime();
      const secondDate = new Date(second.registrationDate || 0).getTime();
      return secondDate - firstDate;
    });

  const latestRegistration = registrations[0];

  return {
    studentId: getValue(student.studentId, student.StudentId),
    studentCode: getValue(student.studentCode, student.StudentCode, 'N/A'),
    studentName: getValue(student.studentName, student.StudentName, ''),
    lastName: getValue(student.lastName, student.LastName, ''),
    fullName: `${getValue(student.studentName, student.StudentName, '')} ${getValue(
      student.lastName,
      student.LastName,
      '',
    )}`.trim(),
    gender: getValue(student.gender, student.Gender, 'N/A'),
    mobileNumber: getValue(student.mobileNumber, student.MobileNumber, 'N/A'),
    whatsappNumber: getValue(student.whatsappNumber, student.WhatsappNumber, 'N/A'),
    emailAddress: getValue(student.emailAddress, student.EmailAddress, 'N/A'),
    birthDate: getValue(student.birthDate, student.BirthDate),
    qualification: getValue(student.qualification, student.Qualification, 'N/A'),
    parentName: getValue(student.parentName, student.ParentName, 'N/A'),
    parentNumber: getValue(student.parentNumber, student.ParentNumber, 'N/A'),
    localAddress: getValue(student.localAddress, student.LocalAddress, 'N/A'),
    permanentAddress: getValue(student.permanentAddress, student.PermanentAddress, 'N/A'),
    branchId: getValue(student.branchId, student.BranchId),
    qualifications,
    registrations,
    latestRegistration,
  };
};

const StudentsListScreen = () => {
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const fetchStudents = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      const [studentsResponse, branchesResponse] = await Promise.all([
        getAllStudents(),
        getBranches(),
      ]);
      const normalizedStudents = safeArray(studentsResponse).map(normalizeStudent);
      console.log('Raw students response:', studentsResponse);

      setStudents(normalizedStudents);
      setBranches(safeArray(branchesResponse));
    } catch (error) {
      console.log('Error loading student details:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents(true);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchStudents(false);
    } finally {
      setRefreshing(false);
    }
  };

  const branchOptions = useMemo(
    () => [
      { label: 'All Branches', value: null },
      ...safeArray(branches).map((branch) => ({
        label: getValue(branch.branchName, branch.BranchName, 'Unnamed Branch'),
        value: getValue(branch.branchId, branch.BranchId),
      })),
    ],
    [branches],
  );

  const filteredStudents = useMemo(() => {
    let filtered = safeArray(students);

    if (searchText) {
      const query = searchText.toLowerCase();
      filtered = filtered.filter((item) => {
        const fullName = item.fullName?.toLowerCase() || '';
        const mobile = item.mobileNumber || '';
        const email = item.emailAddress?.toLowerCase() || '';
        const code = item.studentCode?.toLowerCase() || '';

        return (
          fullName.includes(query) ||
          mobile.includes(searchText) ||
          email.includes(query) ||
          code.includes(query)
        );
      });
    }

    if (selectedBranch !== null) {
      filtered = filtered.filter((item) => item.branchId === selectedBranch);
    }

    return filtered;
  }, [searchText, selectedBranch, students]);

  const openStudentDetails = (student) => {
    setSelectedStudent(student);
    setIsModalVisible(true);
  };

  const closeStudentDetails = () => {
    setSelectedStudent(null);
    setIsModalVisible(false);
  };

  const renderStudentCard = ({ item }) => {
    const latestRegistration = item.latestRegistration;

    return (
      <TouchableOpacity activeOpacity={0.88} onPress={() => openStudentDetails(item)}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.studentName}>{item.fullName || 'N/A'}</Text>
              <Text style={styles.studentCode}>#{item.studentCode}</Text>
            </View>

            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{latestRegistration?.currentStatus || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoBlock}>
            <Text style={styles.infoText}>📞 {item.mobileNumber}</Text>
            <Text style={styles.infoText}>✉️ {item.emailAddress}</Text>
          </View>

          <View style={styles.chipsRow}>
            {/* <View style={styles.chip}>
              <Text style={styles.chipText}>🎓 {item.qualification}</Text>
            </View> */}
            <View style={styles.chip}>
              <Text style={styles.chipText}>📚 {latestRegistration?.courseName || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerMeta}>
              Registered: {formatDate(latestRegistration?.registrationDate)}
            </Text>

            <View style={styles.feeBadge}>
              <Text style={styles.feeText}>₹ {toNumber(latestRegistration?.totalPaid)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <PrivateLayout title="Students List">
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout title="Students List">
      <View style={styles.container}>
        <View style={styles.searchBox}>
          <View style={styles.searchIconWrap}>
            <Text style={styles.searchIcon}>🔍</Text>
          </View>

          <TextInput
            placeholder="Search by name, mobile, email or code"
            placeholderTextColor="#9AA0A6"
            value={searchText}
            onChangeText={setSearchText}
            style={styles.searchInput}
          />
        </View>

        {/* <Dropdown
          style={styles.dropdown}
          containerStyle={styles.dropdownContainer}
          selectedTextStyle={styles.dropdownSelectedText}
          placeholderStyle={styles.dropdownPlaceholder}
          itemTextStyle={styles.dropdownItemText}
          placeholder="Select Branch"
          data={branchOptions}
          labelField="label"
          valueField="value"
          value={selectedBranch}
          onChange={(item) => setSelectedBranch(item.value)}
          maxHeight={220}
        /> */}

        {filteredStudents.length === 0 ? (
          <Text style={styles.emptyText}>No Students Found</Text>
        ) : (
          <FlatList
            data={filteredStudents}
            keyExtractor={(item, index) =>
              String(item.studentId || `${item.studentCode || 'student'}-${index}`)
            }
            refreshing={refreshing}
            onRefresh={onRefresh}
            showsVerticalScrollIndicator={false}
            renderItem={renderStudentCard}
          />
        )}
      </View>

      <Modal
        isVisible={isModalVisible}
        onBackdropPress={closeStudentDetails}
        animationIn="zoomIn"
        animationOut="zoomOut"
        backdropOpacity={0.45}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Student Details</Text>
          </View>

          <TouchableOpacity onPress={closeStudentDetails} style={styles.modalCloseBtn}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalContent}
          >
            <Text style={styles.modalStudentName}>{selectedStudent?.fullName || 'N/A'}</Text>
            <Text style={styles.modalSubText}>Student Code: {selectedStudent?.studentCode || 'N/A'}</Text>

            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Profile Details</Text>
              <Text style={styles.sectionItem}>Name: {selectedStudent?.fullName || 'N/A'}</Text>
              <Text style={styles.sectionItem}>Gender: {selectedStudent?.gender || 'N/A'}</Text>
              <Text style={styles.sectionItem}>Mobile: {selectedStudent?.mobileNumber || 'N/A'}</Text>
              <Text style={styles.sectionItem}>Email: {selectedStudent?.emailAddress || 'N/A'}</Text>
              <Text style={styles.sectionItem}>DOB: {selectedStudent?.birthDate || 'N/A'}</Text>
              <Text style={styles.sectionItem}>Parent Name: {selectedStudent?.parentName || 'N/A'}</Text>
              <Text style={styles.sectionItem}>Parent Contact: {selectedStudent?.parentNumber || 'N/A'}</Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Address</Text>
              <Text style={styles.sectionItem}>Local: {selectedStudent?.localAddress || 'N/A'}</Text>
              <Text style={styles.sectionItem}>
                Permanent: {selectedStudent?.permanentAddress || 'N/A'}
              </Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Registrations</Text>
              {safeArray(selectedStudent?.registrations).length === 0 ? (
                <Text style={styles.sectionItem}>No registrations found.</Text>
              ) : (
                safeArray(selectedStudent?.registrations).map((registration, index) => (
                  <View
                    key={String(registration.registrationId || `${registration.courseName}-${index}`)}
                    style={styles.registrationCard}
                  >
                    <Text style={styles.sectionItem}>
                      Course: {registration.courseName}
                    </Text>
                    <Text style={styles.sectionItem}>
                      Date: {formatDate(registration.registrationDate)}
                    </Text>
                    <Text style={styles.sectionItem}>Fee: ₹ {toNumber(registration.feeAmount)}</Text>
                    <Text style={styles.sectionItem}>Paid: ₹ {toNumber(registration.totalPaid)}</Text>
                    <Text style={styles.sectionItem}>Discount: ₹ {toNumber(registration.discount)}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Qualifications</Text>
              {safeArray(selectedStudent?.qualifications).length === 0 ? (
                <Text style={styles.sectionItem}>No qualifications found.</Text>
              ) : (
                safeArray(selectedStudent?.qualifications).map((qualification, index) => {
                  const qualificationName = getValue(
                    qualification?.qualification,
                    qualification?.Qualification,
                    'N/A',
                  );
                  const passingYear = getValue(
                    qualification?.passingYear,
                    qualification?.PassingYear,
                    'N/A',
                  );
                  const university = getValue(
                    qualification?.university,
                    qualification?.University,
                    'N/A',
                  );
                  const medium = getValue(
                    qualification?.medium,
                    qualification?.Medium,
                    'N/A',
                  );
                  const percentage = getValue(
                    qualification?.percentage,
                    qualification?.Percentage,
                    'N/A',
                  );

                  return (
                    <View
                      key={String(
                        qualification?.qualificationId ||
                          qualification?.QualificationId ||
                          `${qualificationName}-${passingYear}-${index}`,
                      )}
                      style={styles.qualificationCard}
                    >
                      <Text style={styles.sectionItem}>Qualification: {qualificationName}</Text>
                      <Text style={styles.sectionItem}>Passing Year: {passingYear}</Text>
                      <Text style={styles.sectionItem}>University: {university}</Text>
                      <Text style={styles.sectionItem}>Medium: {medium}</Text>
                      <Text style={styles.sectionItem}>Percentage: {percentage}%</Text>
                    </View>
                  );
                })
              )}
            </View>

          </ScrollView>
        </View>
      </Modal>
    </PrivateLayout>
  );
};

export default StudentsListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#ECEFF3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  searchIcon: {
    fontSize: 12,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111',
  },
  dropdown: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ECEFF3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dropdownContainer: {
    borderRadius: 16,
    paddingVertical: 8,
    elevation: 6,
  },
  dropdownSelectedText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111',
  },
  dropdownPlaceholder: {
    color: '#9AA0A6',
    fontSize: 14,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    color: '#777',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
  },
  studentCode: {
    marginTop: 3,
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: '42%',
  },
  statusText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F2F2',
    marginVertical: 12,
  },
  infoBlock: {
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#444',
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  chip: {
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 6,
  },
  chipText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  footerMeta: {
    fontSize: 11,
    color: '#999',
  },
  feeBadge: {
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  feeText: {
    fontSize: 11,
    color: '#555',
    fontWeight: '500',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F6F8',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  modalCloseText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  modalScroll: {
    maxHeight: '100%',
  },
  modalContent: {
    padding: 20,
    paddingTop: 14,
    paddingBottom: 24,
  },
  modalStudentName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  modalSubText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 14,
  },
  modalSection: {
    marginBottom: 14,
    backgroundColor: '#FBFBFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0F2F5',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  sectionItem: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 4,
  },
  registrationCard: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  registrationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  qualificationCard: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  qualificationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
});
