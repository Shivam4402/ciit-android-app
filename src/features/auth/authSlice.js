import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loginApi, studentLoginApi } from './services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const loginUser = createAsyncThunk(
    'auth/loginUser',
    async (data, { rejectWithValue }) => {
        try {
            const response = await loginApi(data);

            const token = response.token || response.Token;
            const staff = {
                userName: data?.userName || data?.UserName || '',
            };

            await AsyncStorage.setItem('token', token);
            await AsyncStorage.setItem('userType', 'staff');
            await AsyncStorage.removeItem('studentProfile');
            await AsyncStorage.setItem('staffProfile', JSON.stringify(staff));

            return { token, userType: 'staff', student: null, staff };
        } catch (error) {
            return rejectWithValue('Login failed');
        }
    }
);

export const loadUserFromStorage = createAsyncThunk(
  'auth/loadUser',
  async () => {
    const token = await AsyncStorage.getItem('token');
        const userType = await AsyncStorage.getItem('userType');
        const studentProfile = await AsyncStorage.getItem('studentProfile');
        const staffProfile = await AsyncStorage.getItem('staffProfile');

        let student = null;
        let staff = null;
        if (studentProfile) {
            try {
                student = JSON.parse(studentProfile);
            } catch {
                student = null;
            }
        }

        if (staffProfile) {
            try {
                staff = JSON.parse(staffProfile);
            } catch {
                staff = null;
            }
        }

        return {
            token,
            userType,
            student,
            staff,
        };
  }
);

export const loginStudent = createAsyncThunk(
        'auth/loginStudent',
        async (data, { rejectWithValue }) => {
                try {
                        const response = await studentLoginApi(data);

                        const token = response.token || response.Token;
                        const student = response.Student || response.student || null;

                        await AsyncStorage.setItem('token', token);
                        await AsyncStorage.setItem('userType', 'student');
                        if (student) {
                            await AsyncStorage.setItem('studentProfile', JSON.stringify(student));
                        } else {
                            await AsyncStorage.removeItem('studentProfile');
                        }
                        await AsyncStorage.removeItem('staffProfile');

                        return { token, student, userType: 'student' };
                } catch (error) {
                        return rejectWithValue('Student login failed');
                }
        }
);

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        token: null,
        userType: null,
        student: null,
        staff: null,
        loading: false,
        error: null,
    },
    reducers: {
        logout: (state) => {
            state.token = null;
            state.userType = null;
            state.student = null;
            state.staff = null;
            // AsyncStorage.removeItem('token');
        },
        updateStudentProfile: (state, action) => {
            const nextStudent = action.payload || null;
            if (!nextStudent) return;

            state.student = {
                ...(state.student || {}),
                ...nextStudent,
            };
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.token = action.payload.token;
                state.userType = action.payload.userType;
                state.student = null;
                state.staff = action.payload.staff;
            })
            .addCase(loginUser.rejected, (state) => {
                state.loading = false;
                state.error = 'Invalid credentials';
            })
            .addCase(loginStudent.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginStudent.fulfilled, (state, action) => {
                state.loading = false;
                state.token = action.payload.token;
                state.userType = action.payload.userType;
                state.student = action.payload.student;
                state.staff = null;
            })
            .addCase(loginStudent.rejected, (state) => {
                state.loading = false;
                state.error = 'Invalid student credentials';
            })
            .addCase(loadUserFromStorage.fulfilled, (state, action) => {
                state.token = action.payload?.token || null;
                state.userType = action.payload?.userType || null;
                state.student = action.payload?.student || null;
                state.staff = action.payload?.staff || null;
            });
    },
});

export const { logout, updateStudentProfile } = authSlice.actions;
export default authSlice.reducer;