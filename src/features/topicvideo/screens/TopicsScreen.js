import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet
} from "react-native";
import { getTopics } from "../services/topicApi";


const TopicsScreen = ({ navigation }) => {
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        const load = async () => {
            const data = await getTopics();
            setTopics(data);
            setLoading(false);
        };
        load();
    }, []);

    if (loading) return <ActivityIndicator size="large" />;

    return (
        <FlatList
            data={topics}
            keyExtractor={(item) => item.topicId.toString()}
            initialNumToRender={5}
            removeClippedSubviews={true}
            renderItem={({ item }) => (
                <TouchableOpacity
                    activeOpacity={0.7}
                    disabled={!item.publicfolderid}
                    style={[
                        styles.topicCard,
                        { opacity: item.publicfolderid ? 1 : 0.5 }
                    ]}
                    onPress={() =>
                        navigation.navigate("CoursePlayer", {
                            folderId: item.publicfolderid,
                            courseName: item.topicName,
                        })
                    }
                >
                    <Text style={styles.topicTitle}>
                        {item.topicName}
                    </Text>

                    {!item.publicfolderid && (
                        <Text style={styles.lockedText}>
                            Coming Soon
                        </Text>
                    )}
                </TouchableOpacity>
            )}
        />
    );
};

export default TopicsScreen;

const styles = StyleSheet.create({
    topicCard: {
        padding: 16,
        marginHorizontal: 12,
        marginVertical: 8,
        borderRadius: 12,
        backgroundColor: "#fff",
        elevation: 2,
    },
    topicTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#222",
    },
    lockedText: {
        fontSize: 12,
        color: "#999",
        marginTop: 4,
    }
});