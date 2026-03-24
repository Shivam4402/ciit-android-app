import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView } from 'react-native';
import { useEnquiry } from '../hooks/useEnquiry';
import { createEnquiry } from '../services/enquiryApi';

const EnquiryFormScreen = () => {
    const { leadSources, enquiryFors, topics, qualifications, branches } = useEnquiry();

    const [candidateName, setCandidateName] = useState('');
    const [selectedLeadSources, setSelectedLeadSources] = useState([]);

    const toggle = (id, list, setList) => {
        if (list.includes(id)) {
            setList(list.filter(x => x !== id));
        } else {
            setList([...list, id]);
        }
    };

    const handleSubmit = async () => {
        const selectedNames = leadSources
            .filter(item => selectedLeadSources.includes(item.sourceId))
            .map(item => item.sourceName);

        const payload = {
            candidateName,
            leadSources: selectedNames.join(", "),
        };
        try {
            const res = await createEnquiry(payload);
            alert("Enquiry submitted successfully");
        } catch (err) {
            console.log(err);
        }
    };

    return (
        <ScrollView style={{ padding: 20 }}>
            <Text>Enquiry Form</Text>

            <TextInput
                placeholder="Candidate Name"
                value={candidateName}
                onChangeText={setCandidateName}
                style={{ borderWidth: 1, marginBottom: 10 }}
            />

            <Text>Lead Sources:</Text>
            {leadSources.map(item => (
                <Text key={item.sourceId}
                    onPress={() => toggle(item.sourceId, selectedLeadSources, setSelectedLeadSources)}>
                    {selectedLeadSources.includes(item.sourceId) ? "☑" : "☐"} {item.sourceName}
                </Text>
            ))}

            <Button title="Submit" onPress={handleSubmit} />
        </ScrollView>
    );
};

export default EnquiryFormScreen;