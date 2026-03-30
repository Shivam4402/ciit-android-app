import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    SafeAreaView,
    Pressable,
    Animated,
    Easing,
} from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { logout } from '../features/auth/authSlice';

const DRAWER_WIDTH = 280;

const NAV_ITEMS = [
    { label: 'Dashboard', routeName: 'Dashboard', icon: 'dashboard' },
    { label: 'Students List', routeName: 'StudentsList', icon: 'groups' },
];

const PrivateLayout = ({ title, children, navItems = NAV_ITEMS }) => {
    const navigation = useNavigation();
    const route = useRoute();
    const dispatch = useDispatch();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

    const activeRouteName = route?.name;

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure?', [
            { text: 'Cancel' },
            {
                text: 'Yes',
                onPress: async () => {
                    await AsyncStorage.removeItem('token');
                    await AsyncStorage.removeItem('userType');
                    await AsyncStorage.removeItem('studentProfile');
                    dispatch(logout());
                },
            },
        ]);
    };

    const closeSidebar = () => {
        Animated.timing(slideAnim, {
            toValue: -DRAWER_WIDTH,
            duration: 220,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start(() => setIsSidebarOpen(false));
    };

    const openSidebar = () => {
        setIsSidebarOpen(true);
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    };

    const toggleSidebar = () => {
        if (isSidebarOpen) {
            closeSidebar();
            return;
        }
        openSidebar();
    };

    const handleNavigate = (routeName) => {
        if (routeName && routeName !== activeRouteName) {
            navigation.navigate(routeName);
        }
        closeSidebar();
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <TouchableOpacity
                                onPress={toggleSidebar}
                                style={styles.menuBtn}
                                accessibilityRole="button"
                                accessibilityLabel={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                            >
                                <MaterialIcons name={isSidebarOpen ? 'close' : 'menu'} size={22} color="#111827" />
                            </TouchableOpacity>

                            <View>
                                <Text style={styles.headerTitle} numberOfLines={1}>
                                    {title}
                                </Text>
                                {/* <Text style={styles.headerSubtitle} numberOfLines={1}>
                                    CIIT Student Management
                                </Text> */}
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleLogout}
                            style={styles.logoutBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Logout"
                        >
                            <MaterialIcons name="logout" size={20} color="#DC2626" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.body}>{children}</View>
                </View>

                {isSidebarOpen ? (
                    <View style={styles.drawerOverlay} pointerEvents="box-none">
                        <Pressable
                            style={styles.drawerBackdrop}
                            onPress={closeSidebar}
                            accessibilityRole="button"
                            accessibilityLabel="Close sidebar"
                        />

                        <Animated.View
                            style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
                            accessibilityRole="menu"
                        >
                            <View style={styles.drawerHeader}>
                                <View style={styles.brandRow}>
                                    <View style={styles.brandIconWrap}>
                                        <MaterialIcons name="school" size={18} color="#1D4ED8" />
                                    </View>
                                    <View>
                                        <Text style={styles.drawerTitle}>CIIT App</Text>
                                        {/* <Text style={styles.drawerSubtitle}>Navigation</Text> */}
                                    </View>
                                </View>

                                <TouchableOpacity
                                    onPress={closeSidebar}
                                    style={styles.closeBtn}
                                    accessibilityRole="button"
                                    accessibilityLabel="Close sidebar"
                                >
                                    <MaterialIcons name="close" size={20} color="#374151" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.sectionLabel}>Main Menu</Text>

                            {navItems.map((item) => {
                                const isActive = activeRouteName === item.routeName;

                                return (
                                    <TouchableOpacity
                                        key={item.routeName}
                                        onPress={() => handleNavigate(item.routeName)}
                                        style={[styles.navItem, isActive && styles.navItemActive]}
                                        accessibilityRole="menuitem"
                                        accessibilityLabel={item.label}
                                    >
                                        <View style={styles.navItemInner}>
                                            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                                                <MaterialIcons 
                                                    name={item.icon}
                                                    size={18}
                                                    color={isActive ? '#1D4ED8' : '#6B7280'}
                                                />
                                            </View>
                                            <Text style={[styles.navText, isActive && styles.navTextActive]} numberOfLines={1}>
                                                {item.label}
                                            </Text>
                                            {isActive ? <MaterialIcons name="chevron-right" size={20} color="#1D4ED8" /> : null}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </Animated.View>
                    </View>
                ) : null}
            </View>
        </SafeAreaView>
    );
};

export default PrivateLayout;

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    content: {
        flex: 1,
    },
    header: {
        height: 68,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    headerLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    headerSubtitle: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 2,
    },
    menuBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    logoutBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    body: {
        flex: 1,
        padding: 12,
    },
    drawerOverlay: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
        zIndex: 20,
    },
    drawerBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(2,6,23,0.35)',
    },
    drawer: {
        width: DRAWER_WIDTH,
        height: '100%',
        backgroundColor: '#FFFFFF',
        paddingTop: 8,
        paddingHorizontal: 10,
        borderRightWidth: 1,
        borderRightColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 6, height: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 10,
    },
    drawerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingTop: 8,
        paddingBottom: 10,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    brandIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#DBEAFE',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    drawerTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
    },
    drawerSubtitle: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },
    closeBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    sectionLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        paddingHorizontal: 10,
        marginBottom: 8,
        marginTop: 4,
    },
    navItem: {
        borderRadius: 14,
        marginBottom: 6,
    },
    navItemActive: {
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    navItemInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 11,
        paddingHorizontal: 10,
    },
    iconWrap: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    iconWrapActive: {
        backgroundColor: '#E0E7FF',
        borderColor: '#BFDBFE',
    },
    navText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 14,
        color: '#334155',
        fontWeight: '500',
    },
    navTextActive: {
        color: '#1E3A8A',
        fontWeight: '700',
    },
});
