import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { getAllEnquiries, getBranches } from '../services/enquiryApi';
import { Dropdown } from 'react-native-element-dropdown';
import Modal from 'react-native-modal';

export default function EnquiryListScreen() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [filteredData, setFilteredData] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const fetchEnquiries = async () => {
        try {
            const res = await getAllEnquiries();

            if (res.success) {
                setData(res.data);

            }
        } catch (error) {
            console.log('Error:', error);
        } finally {
            setLoading(false);
        }
    };
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString();
    };

    const fetchBranches = async () => {
        try {
            const res = await getBranches();
            console.log("Branches:", res);
            setBranches(res);
        } catch (error) {
            console.log("Branch Error:", error);
        }
    };

    const branchOptions = [
        { label: 'All Branches', value: null },
        ...branches.map((b) => ({
            label: b.branchName,
            value: b.branchId,
        }))
    ];

    const onRefresh = async () => {
        setRefreshing(true);

        try {
            await fetchEnquiries();
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchEnquiries();
        fetchBranches();
    }, []);

    useEffect(() => {
        let filtered = data;

        // 🔍 Filter by search text (name + mobile)
        if (searchText) {
            filtered = filtered.filter((item) =>
                item.candidateName?.toLowerCase().includes(searchText.toLowerCase()) ||
                item.mobileNumber?.includes(searchText)
            );
        }

        // 🎯 Filter by branch
        if (selectedBranch !== null) {
            filtered = filtered.filter(
                (item) => item.branchId === selectedBranch
            );
        }

        setFilteredData(filtered);

    }, [searchText, selectedBranch, data]);

    if (loading) {
        return <ActivityIndicator size="large" />;
    }

    return (
        <View style={{ padding: 10 }}>

            <View style={{
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
                elevation: 2
            }}>
                {/* Clean Minimal Icon */}
                <View style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: '#F3F4F6',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 10
                }}>
                    <Text style={{ fontSize: 12, color: '#666' }}>🔍</Text>
                </View>

                <TextInput
                    placeholder="Search by name or mobile"
                    placeholderTextColor="#9AA0A6"
                    value={searchText}
                    onChangeText={setSearchText}
                    style={{
                        flex: 1,
                        fontSize: 14,
                        color: '#111'
                    }}
                />
            </View>
            <Dropdown
                style={{
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
                    elevation: 2
                }}
                containerStyle={{
                    borderRadius: 16,
                    paddingVertical: 8,
                    elevation: 6
                }}
                selectedTextStyle={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: '#111'
                }}
                placeholderStyle={{
                    color: '#9AA0A6',
                    fontSize: 14
                }}
                itemTextStyle={{
                    fontSize: 14,
                    color: '#333'
                }}
                placeholder="Select Branch"
                data={branchOptions}
                labelField="label"
                valueField="value"
                value={selectedBranch}
                onChange={item => setSelectedBranch(item.value)}
                maxHeight={220}
            />

            {filteredData.length === 0 ? (
                <Text style={{ textAlign: 'center', marginTop: 20 }}>
                    No Data Found
                </Text>
            ) : (
                <FlatList
                    data={filteredData}
                    keyExtractor={(item) => item.enquiryId.toString()}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => {
                                setSelectedItem(item);
                                setIsModalVisible(true);
                            }}
                        >
                            <View style={{
                                backgroundColor: '#FFFFFF',
                                borderRadius: 20,
                                padding: 16,
                                marginBottom: 14,

                                // Premium shadow (iOS + Android)
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 6 },
                                shadowOpacity: 0.08,
                                shadowRadius: 10,
                                elevation: 4,

                                borderWidth: 1,
                                borderColor: '#F0F0F0'
                            }}>

                                {/* HEADER */}
                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <View>
                                        <Text style={{
                                            fontSize: 17,
                                            fontWeight: '700',
                                            color: '#111'
                                        }}>
                                            {item.candidateName}
                                        </Text>


                                    </View>

                                    {/* Status Badge (Optional Premium Touch) */}
                                    <View style={{
                                        backgroundColor: '#EEF4FF',
                                        paddingHorizontal: 10,
                                        paddingVertical: 4,
                                        borderRadius: 12
                                    }}>
                                        <Text style={{
                                            fontSize: 11,
                                            color: '#3B82F6',
                                            fontWeight: '600'
                                        }}>
                                            {item.status}

                                        </Text>
                                    </View>
                                </View>

                                {/* DIVIDER */}
                                <View style={{
                                    height: 1,
                                    backgroundColor: '#F2F2F2',
                                    marginVertical: 12
                                }} />

                                {/* CONTACT INFO */}
                                <View style={{ gap: 6 }}>
                                    <Text style={{
                                        fontSize: 13,
                                        color: '#444'
                                    }}>
                                        📞 {item.mobileNumber}
                                    </Text>

                                    <Text style={{
                                        fontSize: 13,
                                        color: '#666'
                                    }}>
                                        ✉️ {item.emailAddress}
                                    </Text>
                                </View>

                                {/* CHIPS */}
                                <View style={{
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    marginTop: 12
                                }}>
                                    <View style={{
                                        backgroundColor: '#F5F7FA',
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 14,
                                        marginRight: 8,
                                        marginBottom: 6
                                    }}>
                                        <Text style={{
                                            fontSize: 12,
                                            color: '#333',
                                            fontWeight: '500'
                                        }}>
                                            🎓 {item.qualification}
                                        </Text>
                                    </View>
                                </View>

                                {/* FOOTER */}
                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginTop: 14
                                }}>
                                    <Text style={{
                                        fontSize: 11,
                                        color: '#999'
                                    }}>
                                        Enquiry Date: {formatDate(item.enquiryDate)}
                                    </Text>

                                    <View style={{
                                        backgroundColor: '#FAFAFA',
                                        paddingHorizontal: 10,
                                        paddingVertical: 5,
                                        borderRadius: 10
                                    }}>
                                        <Text style={{
                                            fontSize: 11,
                                            color: '#555',
                                            fontWeight: '500'
                                        }}>
                                            📍 {item.branchName}
                                        </Text>
                                    </View>
                                </View>

                            </View>
                        </TouchableOpacity>
                    )}
                />



            )}

            <Modal
                isVisible={isModalVisible}
                onBackdropPress={() => setIsModalVisible(false)}
                animationIn="zoomIn"
                animationOut="zoomOut"
                backdropOpacity={0.4}
            >
                <View style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 24,
                    paddingTop: 20,
                    paddingBottom: 10,
                    maxHeight: '85%',

                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.1,
                    shadowRadius: 20,
                    elevation: 8,
                }}>

                    {/* HEADER */}
                    <View style={{
                        paddingHorizontal: 20,
                        paddingBottom: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: '#F2F2F2'
                    }}>
                        <Text style={{
                            fontSize: 18,
                            fontWeight: '700',
                            color: '#111'
                        }}>
                            Enquiry Details
                        </Text>
                    </View>

                    {/* CLOSE BUTTON */}
                    <TouchableOpacity
                        onPress={() => setIsModalVisible(false)}
                        style={{
                            position: 'absolute',
                            top: 14,
                            right: 14,
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: '#F5F6F8',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        <Text style={{
                            fontSize: 14,
                            color: '#333',
                            fontWeight: '600'
                        }}>
                            X
                        </Text>
                    </TouchableOpacity>

                    {/* CONTENT */}
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                            paddingHorizontal: 20,
                            paddingVertical: 16
                        }}
                    >
                        {selectedItem && (
                            <>

                                {/* PERSONAL INFO */}
                                <View style={styles.sectionCard}>
                                    <Text style={styles.sectionHeading}>Personal Information</Text>

                                    <View style={styles.fieldRow}>
                                        <Text style={styles.label}>Name</Text>
                                        <Text style={styles.value}>{selectedItem.candidateName}</Text>
                                    </View>

                                    <View style={styles.fieldRow}>
                                        <Text style={styles.label}>Mobile</Text>
                                        <Text style={styles.value}>{selectedItem.mobileNumber}</Text>
                                    </View>

                                    <View style={styles.fieldRow}>
                                        <Text style={styles.label}>Email</Text>
                                        <Text style={styles.value}>{selectedItem.emailAddress}</Text>
                                    </View>
                                </View>

                                {/* COURSE INFO */}
                                <View style={styles.sectionCard}>
                                    <Text style={styles.sectionHeading}>Course Details</Text>

                                    <View style={styles.fieldRow}>
                                        <Text style={styles.label}>Qualification</Text>
                                        <Text style={styles.value}>{selectedItem.qualification}</Text>
                                    </View>

                                    <View style={styles.fieldRow}>
                                        <Text style={styles.label}>Interested Topics</Text>
                                        <Text style={styles.value}>{selectedItem.interestedTopics}</Text>
                                    </View>
                                </View>

                                {/* ENQUIRY INFO */}
                                <View style={styles.sectionCard}>
                                    <Text style={styles.sectionHeading}>Enquiry Information</Text>

                                    <View style={styles.fieldRow}>
                                        <Text style={styles.label}>Date</Text>
                                        <Text style={styles.value}>{formatDate(selectedItem.enquiryDate)}</Text>
                                    </View>

                                    <View style={styles.fieldRow}>
                                        <Text style={styles.label}>Status</Text>
                                        <Text style={styles.value}>{selectedItem.status}</Text>
                                    </View>

                                    <View style={styles.fieldRow}>
                                        <Text style={styles.label}>Lead Source</Text>
                                        <Text style={styles.value}>{selectedItem.leadSources}</Text>
                                    </View>

                                    <View style={styles.fieldRow}>
                                        <Text style={styles.label}>Branch</Text>
                                        <Text style={styles.value}>{selectedItem.branchName}</Text>
                                    </View>
                                </View>

                            </>
                        )}
                    </ScrollView>

                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    sectionCard: {
        backgroundColor: '#FAFBFC',
        borderRadius: 16,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#F0F0F0'
    },

    sectionHeading: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },

    fieldRow: {
        marginBottom: 10
    },

    label: {
        fontSize: 12,
        color: '#888',
        marginBottom: 2
    },

    value: {
        fontSize: 14,
        color: '#111',
        fontWeight: '500'
    },
    sectionTitle: {
        marginTop: 15,
        fontWeight: 'bold',
        fontSize: 14,
        color: '#444'
    }
})