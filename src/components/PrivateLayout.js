import React, { useRef, useState, useEffect } from 'react';
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
    Image,
    Platform,
    ScrollView, 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import { logout, updateStudentProfile } from '../features/auth/authSlice';
import axiosClient from '../api/axiosClient';
import { launchImageLibrary } from 'react-native-image-picker';
import { getStudentDetailsById } from '../features/student/services/studentPortalApi';

const DRAWER_WIDTH = 280;

const NAV_ITEMS = [
    { label: 'Dashboard', routeName: 'Dashboard', icon: 'dashboard' },
    { label: 'Students List', routeName: 'StudentsList', icon: 'groups' },
    {label: 'Enquiries', routeName: 'EnquiryList', icon: 'question-answer' },
];

const getStudentPhoto = (student) =>
    student?.ProfilePhoto ||
    student?.profilePhoto ||
    student?.ProfileImage ||
    student?.profileImage ||
    '';

const PrivateLayout = ({ title, children, navItems = NAV_ITEMS }) => {
    const navigation = useNavigation();
    const route = useRoute();
    const dispatch = useDispatch();
    const { userType, student, staff } = useSelector((state) => state.auth);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isLogoutOpen, setIsLogoutOpen] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [profilePhotoUri, setProfilePhotoUri] = useState('');
    const [isPhotoLoadFailed, setIsPhotoLoadFailed] = useState(false);

    const normalizePhotoUrl = (url) => {
        if (!url) return '';
        return url
            .replace('http://localhost:', 'http://10.0.2.2:')
            .replace('http://127.0.0.1:', 'http://10.0.2.2:');
    };

    // sync from redux first, then fallback to persisted storage when redux is not hydrated yet
    useEffect(() => {
        let isCancelled = false;

        const syncPhoto = async () => {
            if (userType !== 'student') {
                setProfilePhotoUri('');
                setIsPhotoLoadFailed(false);
                return;
            }

            const nextPhoto = getStudentPhoto(student);
            if (nextPhoto) {
                setProfilePhotoUri(nextPhoto);
                setIsPhotoLoadFailed(false);
                return;
            }

            try {
                const raw = await AsyncStorage.getItem('studentProfile');
                if (!raw || isCancelled) return;

                const storedStudent = JSON.parse(raw);
                const storedPhoto = getStudentPhoto(storedStudent);
                if (storedPhoto) {
                    setProfilePhotoUri(storedPhoto);
                    setIsPhotoLoadFailed(false);
                }
            } catch {
                // ignore storage parse failures silently
            }
        };

        syncPhoto();

        return () => {
            isCancelled = true;
        };
    }, [userType, student?.ProfilePhoto, student?.profilePhoto, student?.ProfileImage, student?.profileImage]);

    // optional API fallback: when photo is missing, re-fetch latest student details once
    useEffect(() => {
        let isCancelled = false;

        const hydratePhotoFromApi = async () => {
            if (userType !== 'student') return;

            const existingPhoto = getStudentPhoto(student);
            if (existingPhoto) return;

            const studentId = student?.StudentId || student?.studentId;
            if (!studentId) return;

            try {
                const details = await getStudentDetailsById(studentId);
                if (!details || isCancelled) return;

                const mergedStudent = {
                    ...(student || {}),
                    ...details,
                };

                const apiPhoto = getStudentPhoto(mergedStudent);
                if (apiPhoto) {
                    setProfilePhotoUri(apiPhoto);
                    setIsPhotoLoadFailed(false);
                }

                await AsyncStorage.setItem('studentProfile', JSON.stringify(mergedStudent));
                dispatch(updateStudentProfile(mergedStudent));
            } catch {
                // keep UI stable; storage/redux fallback already handles most cases
            }
        };

        hydratePhotoFromApi();

        return () => {
            isCancelled = true;
        };
    }, [dispatch, userType, student?.StudentId, student?.studentId]);

    const resolvedProfilePhotoUri = normalizePhotoUrl(profilePhotoUri);

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

    const submitProfilePhotoChange = async () => {
        const studentId = student?.StudentId || student?.studentId;
        if (!studentId) return showError('Error', 'Student id not found.');

        const result = await launchImageLibrary({
            mediaType: 'photo',
            selectionLimit: 1,
            quality: 0.9,
        });

        if (result.didCancel) return;
        if (result.errorCode) return showError('Image Picker Error', result.errorMessage || 'Unable to pick image.');

        const asset = result.assets?.[0];
        if (!asset?.uri) return showError('Error', 'Invalid image selected.');

        const uri =
            Platform.OS === 'android' && asset.originalPath
                ? `file://${asset.originalPath}`
                : asset.uri;

        const fileType = asset.type || 'image/jpeg';
        const ext = fileType.includes('png') ? 'png' : fileType.includes('webp') ? 'webp' : 'jpg';
        const fileName = asset.fileName || `student_${studentId}.${ext}`;

        const formData = new FormData();
        formData.append('profilePhoto', {
            uri,
            name: fileName,
            type: fileType,
        });

        setIsUploadingPhoto(true);
        try {
            const endpoint = `/students/student-change-profile-photo-upload/${studentId}`;
            console.log('UPLOAD URL =>', axiosClient.getUri({ url: endpoint }));
            console.log('UPLOAD FILE =>', { uri, fileName, fileType });

            const response = await axiosClient.post(endpoint, formData, {
                timeout: 60000,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'multipart/form-data',
                },
            });

            const payload = response?.data;
            const message = payload?.message || 'Profile photo updated successfully';
            const newPhoto =
                payload?.data?.profilePhoto ||
                payload?.data?.ProfilePhoto ||
                payload?.profilePhoto ||
                payload?.ProfilePhoto;

            if (newPhoto) {
                setProfilePhotoUri(newPhoto);
                setIsPhotoLoadFailed(false);

                // persist into stored student profile so rebuild/restart keeps it
                const raw = await AsyncStorage.getItem('studentProfile');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    const updated = {
                        ...parsed,
                        ProfilePhoto: newPhoto,
                        profilePhoto: newPhoto,
                    };
                    await AsyncStorage.setItem('studentProfile', JSON.stringify(updated));
                    dispatch(updateStudentProfile(updated));
                } else {
                    const updated = {
                        ...(student || {}),
                        ProfilePhoto: newPhoto,
                        profilePhoto: newPhoto,
                    };
                    await AsyncStorage.setItem('studentProfile', JSON.stringify(updated));
                    dispatch(updateStudentProfile(updated));
                }
            }

            showSuccess('Success', message);
        } catch (error) {
            console.log('Photo upload error =>', {
                url: error?.config?.url,
                baseURL: error?.config?.baseURL,
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message,
            });

            const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                (typeof error?.response?.data === 'string' ? error.response.data : '') ||
                error?.message ||
                'Please try again.';
            showError('Photo update failed', message);
        } finally {
            setIsUploadingPhoto(false);
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

    const handleSettingAction = (key) => {
        closeSidebar();

        // wait for drawer close animation
        setTimeout(() => {
            if (key === 'changePassword') {
                openChangePasswordModal();
                return;
            }
            if (key === 'changePhoto') {
                submitProfilePhotoChange();
                return;
            }
            if (key === 'logout') {
                handleLogout();
            }
        }, 260);
    };

    const studentSettingItems = [
        { key: 'changePassword', label: 'Change Password', icon: 'lock-reset' },
        { key: 'changePhoto', label: 'Change Profile Image', icon: 'photo-camera'},
        { key: 'logout', label: 'Logout', icon: 'logout', color: '#DC2626', isDanger: true },
    ];

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
                                {resolvedProfilePhotoUri && !isPhotoLoadFailed ? (
                                    <Image
                                        source={{ uri: resolvedProfilePhotoUri }}
                                        style={styles.profileAvatarImage}
                                        onError={() => setIsPhotoLoadFailed(true)}
                                    />
                                ) : (
                                    <MaterialIcons name="person" size={24} color="#1D4ED8" />
                                )}
                            </TouchableOpacity>

                            {/* <TouchableOpacity
                                onPress={openChangePasswordModal}
                                style={styles.changePwdBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityRole="button"
                                accessibilityLabel="Change password"
                            >
                                <MaterialIcons name="lock-reset" size={20} color="#7C3AED" />
                            </TouchableOpacity> */}

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
                                    <Image
                                        source={require('../../assets/mainlogo.png')}
                                        style={styles.mainLogo}
                                        resizeMode="contain"
                                    />
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

                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.drawerScrollContent}
                            >
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
                                            activeOpacity={0.85}
                                        >
                                            <View style={styles.navItemInner}>
                                                <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                                                    <MaterialIcons
                                                        name={item.icon}
                                                        size={18}
                                                        color={isActive ? '#1D4ED8' : '#64748B'}
                                                    />
                                                </View>
                                                <Text style={[styles.navText, isActive && styles.navTextActive]} numberOfLines={1}>
                                                    {item.label}
                                                </Text>
                                                <MaterialIcons
                                                    name="chevron-right"
                                                    size={18}
                                                    color={isActive ? '#1D4ED8' : '#94A3B8'}
                                                />
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}

                                {userType === 'student' ? (
                                    <>
                                        <View style={styles.settingsDivider} />
                                        <Text style={styles.sectionLabel}>Settings</Text>

                                        <View style={styles.settingsList}>
                                            {studentSettingItems.map((item) => (
                                                <TouchableOpacity
                                                    key={item.key}
                                                    onPress={() => handleSettingAction(item.key)}
                                                    style={[styles.settingsItem, item.isDanger && styles.settingsItemDanger]}
                                                    accessibilityRole="button"
                                                    accessibilityLabel={item.label}
                                                    activeOpacity={0.88}
                                                >
                                                    <View style={styles.settingsIconWrap}>
                                                        <MaterialIcons name={item.icon} size={18} color={item.color || '#475569'} />
                                                    </View>
                                                    <Text style={[styles.settingsText, item.isDanger && styles.settingsTextDanger]}>
                                                        {item.label}
                                                    </Text>
                                                    <MaterialIcons
                                                        name="chevron-right"
                                                        size={18}
                                                        color={item.isDanger ? '#DC2626' : '#94A3B8'}
                                                    />
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </>
                                ) : null}
                            </ScrollView>
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
                                    {resolvedProfilePhotoUri && !isPhotoLoadFailed ? (
                                        <Image
                                            source={{ uri: resolvedProfilePhotoUri }}
                                            style={styles.profileAvatarImage}
                                            onError={(e) => {
                                                console.log('Profile image load error =>', e?.nativeEvent);
                                                setIsPhotoLoadFailed(true);
                                            }}
                                        />
                                    ) : (
                                        <MaterialIcons name="person" size={24} color="#1D4ED8" />
                                    )}
                                </View>

                                <View style={styles.profileTextWrap}>
                                    <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
                                    <Text style={styles.profileSubText} numberOfLines={1}>{primaryIdentity}</Text>
                                </View>

                                {userType === 'student' ? (
                                    <TouchableOpacity
                                        onPress={submitProfilePhotoChange}
                                        style={styles.profileUploadBtn}
                                        disabled={isUploadingPhoto}
                                        accessibilityRole="button"
                                        accessibilityLabel="Change profile photo"
                                    >
                                        {isUploadingPhoto ? (
                                            <ActivityIndicator size="small" color="#1D4ED8" />
                                        ) : (
                                            <MaterialIcons name="photo-camera" size={18} color="#1D4ED8" />
                                        )}
                                    </TouchableOpacity>
                                ) : null}

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
        width: 296,
        height: '100%',
        backgroundColor: '#FFFFFF',
        paddingTop: 8,
        paddingHorizontal: 12,
        borderRightWidth: 1,
        borderRightColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 8, height: 0 },
        shadowOpacity: 0.16,
        shadowRadius: 20,
        elevation: 14,
    },
    drawerScrollContent: {
        paddingBottom: 22,
    },
    drawerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingTop: 8,
        paddingBottom: 12,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#EEF2F7',
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    brandIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#EAF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    drawerTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
    },
    drawerSubtitle: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
        fontWeight: '600',
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
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        paddingHorizontal: 8,
        marginBottom: 10,
        marginTop: 6,
    },
    navItem: {
        borderRadius: 14,
        marginBottom: 8,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E9EEF5',
    },
    navItemActive: {
        backgroundColor: '#EEF4FF',
        borderColor: '#CFE0FF',
    },
    navItemInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
    },
    iconWrap: {
        width: 30,
        height: 30,
        borderRadius: 9,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    iconWrapActive: {
        backgroundColor: '#E0EAFF',
        borderColor: '#BFDBFE',
    },
    navText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 14,
        color: '#334155',
        fontWeight: '600',
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
    profileAvatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 14,
        resizeMode: 'cover',
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
    profileUploadBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginLeft: 8,
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
        marginLeft: 8,

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
    settingsDivider: {
        height: 1,
        backgroundColor: '#E8EEF6',
        marginVertical: 12,
        marginHorizontal: 6,
    },
    settingsList: {
        marginTop: 2,
        gap: 8,
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 11,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    settingsItemDanger: {
        backgroundColor: '#FFF5F5',
        borderColor: '#FECACA',
    },
    settingsIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 9,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        color: '#334155',
        fontWeight: '600',
    },
    settingsTextDanger: {
        color: '#B91C1C',
    },
     mainLogo: {
        width: 100,
        height: 80,
    },
});
