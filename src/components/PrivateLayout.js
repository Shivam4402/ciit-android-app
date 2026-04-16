import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Pressable,
    Animated,
    Easing,
    Modal,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import { logout } from '../features/auth/authSlice';
import axiosClient from '../api/axiosClient';

const DRAWER_WIDTH = 280;

const NAV_ITEMS = [
    { label: 'Dashboard', routeName: 'Dashboard', icon: 'dashboard' },
    { label: 'Students List', routeName: 'StudentsList', icon: 'groups' },
];

const PrivateLayout = ({ title, children, navItems = NAV_ITEMS }) => {
    const navigation = useNavigation();
    const route = useRoute();
    const dispatch = useDispatch();
    const { userType, student, staff } = useSelector((state) => state.auth);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isLogoutOpen, setIsLogoutOpen] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

    const activeRouteName = route?.name;

    const showError = (text1, text2 = '') => Toast.show({ type: 'error', text1, text2 });
    const showSuccess = (text1, text2 = '') => Toast.show({ type: 'success', text1, text2 });

    const handleLogout = () => {
        setIsLogoutOpen(true);
    };

    const confirmLogout = async () => {
        // try {
        setIsLogoutOpen(false);
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('userType');
        await AsyncStorage.removeItem('studentProfile');
        await AsyncStorage.removeItem('staffProfile');
        dispatch(logout());
        //     showSuccess('Logged out', 'You have been logged out successfully.');
        // } catch {
        //     showError('Logout failed', 'Please try again.');
        // }
    };

    const openChangePasswordModal = () => {
        if (userType !== 'student') {
            showError('Not supported', 'Change password is available for students only.');
            return;
        }
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setIsChangePasswordOpen(true);
    };

    const submitChangePassword = async () => {
        const userName =
            student?.PermanentIdentificationNumber ||
            student?.permanentIdentificationNumber ||
            student?.EmailAddress ||
            student?.emailAddress;

        if (!userName) return showError('Error', 'Student username is not available.');
        if (!oldPassword || !newPassword || !confirmNewPassword) {
            return showError('Validation', 'Old, new and confirm password are required.');
        }
        if (newPassword !== confirmNewPassword) {
            return showError('Validation', 'New password and confirm password do not match.');
        }
        if (oldPassword === newPassword) {
            return showError('Validation', 'New password must be different from old password.');
        }

        setIsChangingPassword(true);
        try {
            const response = await axiosClient.post('/auth/student-change-password', {
                UserName: userName,
                OldPassword: oldPassword,
                NewPassword: newPassword,
                ConfirmNewPassword: confirmNewPassword,
            });
            const message =
                response?.data?.message ||
                response?.data?.Message ||
                'Password changed successfully';

            showSuccess('Success', message);
            setIsChangePasswordOpen(false);
            setOldPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (error) {
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.Message ||
                (typeof error?.response?.data === 'string' ? error.response.data : '') ||
                error?.message ||
                'Please try again.';
            showError('Change password failed', message);
        } finally {
            setIsChangingPassword(false);
        }
    };

    const displayName = userType === 'student'
        ? `${student?.StudentName || student?.studentName || ''} ${student?.LastName || student?.lastName || ''}`.trim() || 'Student'
        : (staff?.userName || 'Staff User');

    const primaryIdentity = userType === 'student'
        ? (student?.EmailAddress || student?.emailAddress || student?.StudentCode || student?.studentCode || 'N/A')
        : (staff?.userName || 'N/A');

    const profileRows = userType === 'student'
        ?

        [
            // { label: 'Student ID', value: student?.StudentId || student?.studentId || 'N/A' },
            // { label: 'Code', value: student?.StudentCode || student?.studentCode || 'N/A' },
            { label: 'Email', value: student?.EmailAddress || student?.emailAddress || 'N/A' },
            { label: 'Mobile', value: student?.MobileNumber || student?.mobileNumber || 'N/A' },
            { label: 'Branch', value: student?.BranchName || student?.branchName || 'N/A' },
            { label: 'Role', value: 'Student' },
        ]
        : [
            { label: 'Username', value: staff?.userName || 'N/A' },
            { label: 'Role', value: 'Staff' },
        ];

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
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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

                        <View style={styles.headerRight}>

                            <TouchableOpacity
                                onPress={() => setIsProfileOpen(true)}
                                style={styles.profileBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityRole="button"
                                accessibilityLabel="Open profile"
                            >
                                <MaterialIcons name="person-outline" size={20} color="#2563EB" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={openChangePasswordModal}
                                style={styles.changePwdBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityRole="button"
                                accessibilityLabel="Change password"
                            >
                                <MaterialIcons name="lock-reset" size={20} color="#7C3AED" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleLogout}
                                style={styles.logoutBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityRole="button"
                                accessibilityLabel="Logout"
                            >
                                <MaterialIcons name="logout" size={20} color="#DC2626" />
                            </TouchableOpacity>
                        </View>
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

                <Modal
                    visible={isProfileOpen}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setIsProfileOpen(false)}
                >
                    <Pressable style={styles.profileModalBackdrop} onPress={() => setIsProfileOpen(false)}>
                        <Pressable style={styles.profileModalCard} onPress={() => null}>
                            <View style={styles.profileHeader}>
                                <View style={styles.profileAvatarWrap}>
                                    <MaterialIcons name="person" size={24} color="#1D4ED8" />
                                </View>
                                <View style={styles.profileTextWrap}>
                                    <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
                                    <Text style={styles.profileSubText} numberOfLines={1}>{primaryIdentity}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setIsProfileOpen(false)}
                                    style={styles.profileCloseBtn}
                                    accessibilityRole="button"
                                    accessibilityLabel="Close profile"
                                >
                                    <MaterialIcons name="close" size={20} color="#475569" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.profileDivider} />

                            {profileRows.map((row) => (
                                <View key={row.label} style={styles.profileRow}>
                                    <Text style={styles.profileLabel}>{row.label}</Text>
                                    <Text style={styles.profileValue}>{row.value}</Text>
                                </View>
                            ))}
                        </Pressable>
                    </Pressable>
                </Modal>

                <Modal
                    visible={isLogoutOpen}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setIsLogoutOpen(false)}
                >
                    <Pressable style={styles.profileModalBackdrop} onPress={() => setIsLogoutOpen(false)}>
                        <Pressable style={styles.profileModalCard} onPress={() => null}>
                            <Text style={styles.logoutTitle}>Logout</Text>
                            <Text style={styles.logoutMessage}>Are you sure you want to logout?</Text>

                            <View style={styles.logoutActions}>
                                <TouchableOpacity
                                    onPress={() => setIsLogoutOpen(false)}
                                    style={styles.logoutCancel}
                                >
                                    <Text style={styles.logoutCancelText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={confirmLogout}
                                    style={styles.logoutConfirm}
                                >
                                    <Text style={styles.logoutConfirmText}>Yes, Logout</Text>
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>

                <Modal
                    visible={isChangePasswordOpen}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setIsChangePasswordOpen(false)}
                >
                    <Pressable style={styles.profileModalBackdrop} onPress={() => setIsChangePasswordOpen(false)}>
                        <Pressable style={styles.profileModalCard} onPress={() => null}>
                            <Text style={styles.logoutTitle}>Change Password</Text>
                            <Text style={styles.logoutMessage}>Enter old password and set a new one.</Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.profileLabel}>Old Password</Text>
                                <TextInput
                                    value={oldPassword}
                                    onChangeText={setOldPassword}
                                    secureTextEntry
                                    placeholder="Enter old password"
                                    placeholderTextColor="#94A3B8"
                                    style={styles.input}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.profileLabel}>New Password</Text>
                                <TextInput
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry
                                    placeholder="Enter new password"
                                    placeholderTextColor="#94A3B8"
                                    style={styles.input}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.profileLabel}>Confirm New Password</Text>
                                <TextInput
                                    value={confirmNewPassword}
                                    onChangeText={setConfirmNewPassword}
                                    secureTextEntry
                                    placeholder="Re-enter new password"
                                    placeholderTextColor="#94A3B8"
                                    style={styles.input}
                                />
                            </View>

                            <View style={styles.logoutActions}>
                                <TouchableOpacity
                                    onPress={() => setIsChangePasswordOpen(false)}
                                    style={styles.logoutCancel}
                                    disabled={isChangingPassword}
                                >
                                    <Text style={styles.logoutCancelText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={submitChangePassword}
                                    style={styles.changePwdConfirm}
                                    disabled={isChangingPassword}
                                >
                                    {isChangingPassword ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.logoutConfirmText}>Change Password</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>
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
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    changePwdBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F5F3FF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DDD6FE',
    },
    profileBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#BFDBFE',
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
    profileModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(2, 6, 23, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    profileModalCard: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    changePasswordModalCard: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileAvatarWrap: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: '#DBEAFE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileTextWrap: {
        flex: 1,
        marginLeft: 10,
        marginRight: 8,
    },
    profileName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    profileSubText: {
        marginTop: 3,
        fontSize: 13,
        color: '#64748B',
    },
    profileCloseBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileDivider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 14,
    },
    profileRow: {
        marginBottom: 10,
    },
    profileLabel: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 2,
    },
    profileValue: {
        fontSize: 14,
        color: '#0F172A',
        fontWeight: '600',
    },
    logoutTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 6,
    },
    logoutMessage: {
        fontSize: 13,
        color: '#64748B',
        marginBottom: 14,
    },
    logoutActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    logoutCancel: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
    },
    logoutCancelText: {
        color: '#334155',
        fontWeight: '600',
        fontSize: 13,
    },
    logoutConfirm: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#EF4444',
    },
    logoutConfirmText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 13,
    },
    inputGroup: {
        marginBottom: 10,
    },
    input: {
        height: 42,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        paddingHorizontal: 12,
        color: '#0F172A',
        backgroundColor: '#FFFFFF',
    },
    changePwdConfirm: {
        minWidth: 130,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#7C3AED',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
