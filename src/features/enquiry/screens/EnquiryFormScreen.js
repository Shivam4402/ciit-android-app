import React, { useState } from 'react';
import {
    View, Text, TextInput, ScrollView,
    TouchableOpacity, Button, StyleSheet
} from 'react-native';
import { useEnquiry } from '../hooks/useEnquiry';
import { createEnquiry } from '../services/enquiryApi';
import { Dropdown } from 'react-native-element-dropdown';
import DateTimePicker from '@react-native-community/datetimepicker';

const EnquiryFormScreen = ({ navigation }) => {
    const { leadSources, enquiryFors, topics, qualifications, branches } = useEnquiry();

    // 🔹 form state
    const [form, setForm] = useState({
        candidateName: '',
        email: '',
        mobile: '',
        gender: '',
        localAddress: '',
        birthDate: null,
        branchId: '',
        qualification: '',
    });

    const [selectedLeadSources, setSelectedLeadSources] = useState([]);
    const [selectedEnquiryFors, setSelectedEnquiryFors] = useState([]);
    const [selectedTopics, setSelectedTopics] = useState([]);
    const [dob, setDob] = useState(null);
    const [showDobPicker, setShowDobPicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState({});

    // 🔹 toggle checkbox
    const toggle = (id, list, setList) => {
        if (list.includes(id)) {
            setList(list.filter(x => x !== id));
        } else {
            setList([...list, id]);
        }
    };

    // Qualification dropdown data
    const qualificationOptions = qualifications?.map(q => ({
        label: q.qualification,
        value: q.qualification
    }));

    // Branch dropdown data
    const branchOptions = branches?.map(b => ({
        label: b.branchName,
        value: b.branchId
    }));

    

    // 🔹 validation
    const validate = () => {
        let newErrors = {};

        if (!form.candidateName) newErrors.candidateName = "Name is required";
        if (!form.email) newErrors.email = "Email is required";
        if (!form.mobile) newErrors.mobile = "Mobile is required";
        if (!form.localAddress) newErrors.localAddress = "Local address is required";
        if (!form.gender) newErrors.gender = "Select gender";
        if (!form.branchId) newErrors.branchId = "Select branch";
        if (!form.qualification) newErrors.qualification = "Select qualification";
        if (!dob) newErrors.dob = "Birth date is required";

        // simple email check
        if (form.email && !form.email.includes("@")) {
            newErrors.email = "*Invalid email";
        }

        if (form.mobile && form.mobile.length !== 10) {
            newErrors.mobile = "*Mobile must be 10 digits";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const isFormValid =
        form.candidateName &&
        form.email &&
        form.mobile &&
        form.gender &&
        form.localAddress &&
        form.branchId &&
        form.qualification &&
        dob;
    // 🔹 submit
    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);

        const leadNames = leadSources
            .filter(x => selectedLeadSources.includes(x.sourceId))
            .map(x => x.sourceName);

        const enquiryNames = enquiryFors
            .filter(x => selectedEnquiryFors.includes(x.enquiryForId))
            .map(x => x.enquiryFor);

        const topicNames = topics
            .filter(x => selectedTopics.includes(x.topicId))
            .map(x => x.topicName);

        const payload = {
            candidateName: form.candidateName,
            emailAddress: form.email,
            mobileNumber: form.mobile,
            localAddress: form.localAddress,
            gender: form.gender,
            birthDate: dob ? dob.toISOString() : null,
            branchId: form.branchId,
            qualification: form.qualification,
            leadSources: leadNames.join(", "),
            enquiryFors: enquiryNames.join(", "),
            interestedTopics: topicNames.join(", "),
        };


        try {
            await createEnquiry(payload);

            alert("✅ Enquiry submitted successfully");


            // reset form
            setForm({
                candidateName: '',
                email: '',
                mobile: '',
                gender: '',
                localAddress: '',
                birthDate: null,
                branchId: '',
                qualification: '',
            });

            setSelectedLeadSources([]);
            setSelectedEnquiryFors([]);
            setSelectedTopics([]);
            setErrors({});

            setTimeout(() => {
                navigation.replace('Login');
            }, 2000);

        } catch (err) {
            console.log(err);
            alert("❌ Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1 }}>

            <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
                <View style={styles.card}>

                    <Text style={styles.title}>Enquiry Form</Text>

                    {/* Name */}
                    <TextInput
                        placeholder="Candidate Name"
                        value={form.candidateName}
                        onChangeText={(val) => setForm({ ...form, candidateName: val })}
                        style={styles.input}
                    />
                    {errors.candidateName && <Text style={styles.error}>{errors.candidateName}</Text>}

                    {/* Email */}
                    <TextInput
                        placeholder="Email"
                        value={form.email}
                        onChangeText={(val) => setForm({ ...form, email: val })}
                        style={styles.input}
                    />
                    {errors.email && <Text style={styles.error}>{errors.email}</Text>}

                    {/* Mobile */}
                    <TextInput
                        placeholder="Mobile"
                        keyboardType="numeric"
                        value={form.mobile}
                        onChangeText={(val) => setForm({ ...form, mobile: val })}
                        style={styles.input}
                    />
                    {errors.mobile && <Text style={styles.error}>{errors.mobile}</Text>}

                    {/* Local Address */}

                    <TextInput
                        placeholder="Local Address"
                        value={form.localAddress}
                        onChangeText={(val) => setForm({ ...form, localAddress: val })}
                        style={[styles.input, { height: 80 }]}
                        multiline
                    />

                    {errors.localAddress && (
                        <Text style={styles.error}>{errors.localAddress}</Text>
                    )}

                    {/* Birth Date */}

                    <Text style={styles.label}>Birth Date</Text>
                    <TouchableOpacity
                        style={styles.input}
                        onPress={() => setShowDobPicker(true)}
                    >
                        <Text>
                            {dob ? dob.toLocaleDateString() : "Select Birth Date"}
                        </Text>
                    </TouchableOpacity>

                    {showDobPicker && (
                        <DateTimePicker
                            value={dob || new Date()}
                            mode="date"
                            display="default"
                            maximumDate={new Date()}
                            onValueChange={(event, selectedDate) => {
                                setShowDobPicker(false);
                                if (selectedDate) {
                                    setDob(selectedDate);
                                }
                            }}
                        />
                    )}
                    {errors.dob && <Text style={styles.error}>{errors.dob}</Text>}

                    {/* Gender */}
                    <Text style={styles.label}>Gender</Text>

                    <View style={styles.chipGrid}>
                        {["Male", "Female"].map(g => {
                            const isSelected = form.gender === g;

                            return (
                                <TouchableOpacity
                                    key={g}
                                    style={[
                                        styles.chipContainer,
                                        isSelected && styles.chipSelected
                                    ]}
                                    onPress={() => setForm({ ...form, gender: g })}
                                >
                                    {/* Radio Circle */}
                                    <View style={[
                                        styles.circle,
                                        isSelected && styles.circleSelected
                                    ]}>
                                        {isSelected && <View style={styles.innerDot} />}
                                    </View>

                                    {/* Text */}
                                    <Text style={[
                                        styles.chipText,
                                        isSelected && styles.chipTextSelected
                                    ]}>
                                        {g}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {errors.gender && <Text style={styles.error}>{errors.gender}</Text>}
                    {/* Qualification */}

                    <Text style={styles.label}>Qualification</Text>

                    <View style={styles.pickerContainer}>
                        <Dropdown
                            style={styles.dropdown}
                            data={qualificationOptions}
                            labelField="label"
                            valueField="value"
                            placeholder="Select Qualification"
                            value={form.qualification}
                            onChange={item => {
                                setForm({ ...form, qualification: item.value });
                            }}
                            search
                            searchPlaceholder="Search qualification..."
                            maxHeight={300}
                            containerStyle={{
                                borderRadius: 14,
                                backgroundColor: '#fff',
                                elevation: 6,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.15,
                                shadowRadius: 6,
                            }}

                            placeholderStyle={{
                                fontSize: 14,
                                color: '#999'
                            }}

                            selectedTextStyle={{
                                fontSize: 15,
                                color: '#333'
                            }}

                            activeColor="#E3F2FD"


                        />
                    </View>

                    {errors.qualification && <Text style={styles.error}>{errors.qualification}</Text>}

                    {/* Branch */}

                    <Text style={styles.label}>Branch</Text>

                    <View style={styles.pickerContainer}>
                        <Dropdown
                            style={styles.dropdown}
                            data={branchOptions}
                            labelField="label"
                            valueField="value"
                            placeholder="Select Branch"
                            value={form.branchId}
                            onChange={item => {
                                setForm({ ...form, branchId: item.value });
                            }}
                            search
                            searchPlaceholder="Search branch..."
                            maxHeight={300}
                            containerStyle={{
                                borderRadius: 14,
                                backgroundColor: '#fff',
                                elevation: 6,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.15,
                                shadowRadius: 6,
                            }}

                            placeholderStyle={{
                                fontSize: 14,
                                color: '#999'
                            }}

                            selectedTextStyle={{
                                fontSize: 15,
                                color: '#333'
                            }}

                            activeColor="#E3F2FD"
                        />
                    </View>

                    {errors.branchId && <Text style={styles.error}>{errors.branchId}</Text>}

                    {/* Lead Sources */}
                    <Text style={styles.label}>How did you come to know about us?</Text>

                    <View style={styles.chipGrid}>
                        {leadSources?.map(item => {
                            const isSelected = selectedLeadSources.includes(item.sourceId);

                            return (
                                <TouchableOpacity
                                    key={item.sourceId}
                                    style={[
                                        styles.chipContainer,
                                        isSelected && styles.chipSelected
                                    ]}
                                    onPress={() =>
                                        toggle(item.sourceId, selectedLeadSources, setSelectedLeadSources)
                                    }
                                >
                                    {/* Circle */}
                                    <View style={[
                                        styles.circle,
                                        isSelected && styles.circleSelected
                                    ]}>
                                        {isSelected && <Text style={styles.tick}>✓</Text>}
                                    </View>

                                    {/* Text */}
                                    <Text
                                        style={[
                                            styles.chipText,
                                            isSelected && styles.chipTextSelected
                                        ]}
                                        numberOfLines={2}
                                    >
                                        {item.sourceName}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Enquiry For */}
                    <Text style={styles.label}>Enquiry For</Text>

                    <View style={styles.chipGrid}>
                        {enquiryFors?.map(item => {
                            const isSelected = selectedEnquiryFors.includes(item.enquiryForId);

                            return (
                                <TouchableOpacity
                                    key={item.enquiryForId}
                                    style={[
                                        styles.chipContainer,
                                        isSelected && styles.chipSelected
                                    ]}
                                    onPress={() =>
                                        toggle(item.enquiryForId, selectedEnquiryFors, setSelectedEnquiryFors)
                                    }
                                >
                                    {/* Circle */}
                                    <View style={[
                                        styles.circle,
                                        isSelected && styles.circleSelected
                                    ]}>
                                        {isSelected && <Text style={styles.tick}>✓</Text>}
                                    </View>

                                    {/* Text */}
                                    <Text
                                        style={[
                                            styles.chipText,
                                            isSelected && styles.chipTextSelected
                                        ]}
                                        numberOfLines={2}
                                    >
                                        {item.enquiryFor}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    {/* Topics */}
                    <Text style={styles.label}>Interested Training Topics</Text>

                    <View style={styles.chipGrid}>
                        {topics?.map(item => {
                            const isSelected = selectedTopics.includes(item.topicId);

                            return (
                                <TouchableOpacity
                                    key={item.topicId}
                                    style={[
                                        styles.chipContainer,
                                        isSelected && styles.chipSelected
                                    ]}
                                    onPress={() =>
                                        toggle(item.topicId, selectedTopics, setSelectedTopics)
                                    }
                                >
                                    {/* Circle */}
                                    <View style={[
                                        styles.circle,
                                        isSelected && styles.circleSelected
                                    ]}>
                                        {isSelected && <Text style={styles.tick}>✓</Text>}
                                    </View>

                                    {/* Text */}
                                    <Text style={[
                                        styles.chipText,
                                        isSelected && styles.chipTextSelected
                                    ]}>
                                        {item.topicName}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                </View>

            </ScrollView>
            {/* Sticky Button */}
            <View style={styles.bottomContainer}>
                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        !isFormValid && styles.disabledButton
                    ]}
                    onPress={handleSubmit}
                    disabled={!isFormValid}
                >
                    <Text style={styles.submitText}>
                        {loading ? "Submitting..." : "SUBMIT ENQUIRY"}
                    </Text>
                </TouchableOpacity>
                {!isFormValid && (
                    <Text style={{
                        textAlign: 'center',
                        color: '#ec1414ff',
                        marginTop: 5,
                        fontSize: 12
                    }}>
                        *Please fill all required fields
                    </Text>
                )}
            </View>



        </View>

    );
};

export default EnquiryFormScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F6F8',
    },

    card: {
        backgroundColor: '#fff',
        margin: 15,
        padding: 18,
        borderRadius: 14,
        elevation: 4,
    },

    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1E88E5',
        marginBottom: 15,
        textAlign: 'center'
    },

    input: {
        backgroundColor: '#F1F3F6',
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
        fontSize: 14,
    },

    label: {
        marginTop: 12,
        marginBottom: 6,
        fontWeight: '600',
        color: '#333'
    },


    row: {
        flexDirection: "row",
        gap: 20
    },

    pickerContainer: {
        backgroundColor: '#F1F3F6',
        borderRadius: 10,
        marginBottom: 12,
    },

    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 10
    },

    chipContainer: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F5F5F5',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 30,
        marginBottom: 12,
        elevation: 2
    },

    chipSelected: {
        backgroundColor: '#E8E3FF'
    },

    circle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#999',
        marginRight: 10,
        marginTop: 2,
        alignItems: 'center',
        justifyContent: 'center'
    },

    circleSelected: {
        backgroundColor: '#1E88E5',
        borderColor: '#1E88E5'
    },

    tick: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold'
    },

    chipText: {
        fontSize: 13,
        color: '#333',
        flex: 1,
        flexWrap: 'wrap',
    },

    chipTextSelected: {
        color: '#1E88E5',
        fontWeight: '600'
    },

    innerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fff'
    },

    bottomContainer: {
        position: 'absolute',
        bottom: 0,          // ✅ stick to very bottom
        left: 0,
        right: 0,
        backgroundColor: '#fff',

        paddingHorizontal: 15,
        paddingTop: 10,
        paddingBottom: 0,   // 🔥 reduce this (was ~15 before)

        borderTopWidth: 1,
        borderColor: '#eee'
    },

    submitButton: {
        backgroundColor: '#1E88E5',
        padding: 16,
        borderRadius: 10,
        alignItems: 'center'
    },

    submitText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    },

    disabledButton: {
        backgroundColor: '#B0BEC5'
    },

    dropdown: {
        height: 55,
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingHorizontal: 14,
        marginBottom: 14,

        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    error: {
        color: "red",
        marginBottom: 5
    }
});
