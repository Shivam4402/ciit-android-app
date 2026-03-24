import React, { useState } from 'react';
import {
    View, Text, TextInput, ScrollView,
    TouchableOpacity, Button, StyleSheet
} from 'react-native';
import { useEnquiry } from '../hooks/useEnquiry';
import { createEnquiry } from '../services/enquiryApi';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

const EnquiryFormScreen = () => {
    const { leadSources, enquiryFors, topics, qualifications, branches } = useEnquiry();

    // 🔹 form state
    const [form, setForm] = useState({
        candidateName: '',
        email: '',
        mobile: '',
        gender: '',
        birthdate: null,
        branchId: '',
        qualification: '',
    });

    const [selectedLeadSources, setSelectedLeadSources] = useState([]);
    const [selectedEnquiryFors, setSelectedEnquiryFors] = useState([]);
    const [selectedTopics, setSelectedTopics] = useState([]);
    const [dob, setDob] = useState(null);
    const [showDobPicker, setShowDobPicker] = useState(false);

    const [errors, setErrors] = useState({});

    // 🔹 toggle checkbox
    const toggle = (id, list, setList) => {
        if (list.includes(id)) {
            setList(list.filter(x => x !== id));
        } else {
            setList([...list, id]);
        }
    };

    // 🔹 validation
    const validate = () => {
        let newErrors = {};

        if (!form.candidateName) newErrors.candidateName = "Name is required";
        if (!form.email) newErrors.email = "Email is required";
        if (!form.mobile) newErrors.mobile = "Mobile is required";
        if (!form.gender) newErrors.gender = "Select gender";
        if (!form.branchId) newErrors.branchId = "Select branch";
        if (!form.qualification) newErrors.qualification = "Select qualification";
        if (!dob) newErrors.dob = "Birth date is required";

        // simple email check
        if (form.email && !form.email.includes("@")) {
            newErrors.email = "Invalid email";
        }

        if (form.mobile && form.mobile.length !== 10) {
            newErrors.mobile = "Mobile must be 10 digits";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 🔹 submit
    const handleSubmit = async () => {
        if (!validate()) return;

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
            gender: form.gender,
            birthdate: dob ? dob.toISOString(): null,
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
            setForm({});
            setSelectedLeadSources([]);
            setSelectedEnquiryFors([]);
            setSelectedTopics([]);
            setErrors({});
        } catch (err) {
            console.log(err);
            alert("❌ Something went wrong");
        }
    };

    return (
        <ScrollView style={styles.container}>
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

            {/* Birth Date */}

            <Text style={styles.label}>Birth Date</Text>
            <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDobPicker(true)}
            >
                <Text>
                    {dob ? dob.toLocaleDateString(): "Select Birth Date"}
                </Text>
            </TouchableOpacity>

            {showDobPicker && (
                <DateTimePicker
                    value={dob || new Date()}
                    mode="date"
                    display="default"
                    maximumDate={new Date()} 
                    onChange={(event, selectedDate) => {
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
            <View style={styles.row}>
                {["Male", "Female"].map(g => (
                    <TouchableOpacity key={g}
                        onPress={() => setForm({ ...form, gender: g })}>
                        <Text>
                            {form.gender === g ? "🔘" : "⚪"} {g}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            {errors.gender && <Text style={styles.error}>{errors.gender}</Text>}

            {/* Qualification */}

            <Text style={styles.label}>Qualification</Text>

            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={form.qualification}
                    onValueChange={(itemValue) =>
                        setForm({ ...form, qualification: itemValue })
                    }
                >
                    <Picker.Item label=" Select Qualification " value="" color="gray" />


                    {qualifications.map((item) => (
                        <Picker.Item
                            key={item.qualificationId}
                            label={item.qualification}
                            value={item.qualification}
                        />
                    ))}
                </Picker>
            </View>

            {errors.qualification && <Text style={styles.error}>{errors.qualification}</Text>}

            {/* Branch */}

            <Text style={styles.label}>Branch</Text>

            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={form.branchId}
                    onValueChange={(itemValue) =>
                        setForm({ ...form, branchId: itemValue })
                    }
                >
                    <Picker.Item label=" Select Branch " value="" color="gray" />

                    {branches.map((item) => (
                        <Picker.Item
                            key={item.branchId}
                            label={item.branchName}
                            value={item.branchId}
                        />
                    ))}
                </Picker>
            </View>

            {errors.branchId && <Text style={styles.error}>{errors.branchId}</Text>}

            {/* Lead Sources */}
            <Text style={styles.label}>How did you come to know about us?</Text>
            {leadSources.map(item => (
                <Text key={item.sourceId}
                    onPress={() => toggle(item.sourceId, selectedLeadSources, setSelectedLeadSources)}>
                    {selectedLeadSources.includes(item.sourceId) ? "☑" : "☐"} {item.sourceName}
                </Text>
            ))}

            {/* Enquiry For */}
            <Text style={styles.label}>Enquiry For</Text>
            {enquiryFors.map(item => (
                <Text key={item.enquiryForId}
                    onPress={() => toggle(item.enquiryForId, selectedEnquiryFors, setSelectedEnquiryFors)}>
                    {selectedEnquiryFors.includes(item.enquiryForId) ? "☑" : "☐"} {item.enquiryFor}
                </Text>
            ))}

            {/* Topics */}
            <Text style={styles.label}>Tick your Interesting Training Topics</Text>
            {topics.map(item => (
                <Text key={item.topicId}
                    onPress={() => toggle(item.topicId, selectedTopics, setSelectedTopics)}>
                    {selectedTopics.includes(item.topicId) ? "☑" : "☐"} {item.topicName}
                </Text>
            ))}

            <View style={{ marginTop: 20 }}>
                <Button title="Submit" onPress={handleSubmit} />
            </View>
        </ScrollView>
    );
};

export default EnquiryFormScreen;

const styles = StyleSheet.create({
    container: {
        padding: 15,
        backgroundColor: "#fff"
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 15
    },
    input: {
        borderWidth: 1,
        padding: 10,
        marginBottom: 8,
        borderRadius: 5
    },
    label: {
        marginTop: 10,
        fontWeight: "bold"
    },
    row: {
        flexDirection: "row",
        gap: 20
    },
    pickerContainer: {
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 10
    },
    error: {
        color: "red",
        marginBottom: 5
    }
});
