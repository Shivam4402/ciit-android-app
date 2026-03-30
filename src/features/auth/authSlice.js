import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loginApi, studentLoginApi } from './services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const loginUser = createAsyncThunk(
    'auth/loginUser',
    async (data, { rejectWithValue }) => {
        try {
            const response = await loginApi(data);

            const token = response.token || response.Token;

            await AsyncStorage.setItem('token', token);
            await AsyncStorage.setItem('userType', 'staff');
            await AsyncStorage.removeItem('studentProfile');

            return { token, userType: 'staff', student: null };
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

        let student = null;
        if (studentProfile) {
            try {
                student = JSON.parse(studentProfile);
            } catch {
                student = null;
            }
        }

        return {
            token,
            userType,
            student,
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
        loading: false,
        error: null,
    },
    reducers: {
        logout: (state) => {
            state.token = null;
            state.userType = null;
            state.student = null;
            // AsyncStorage.removeItem('token');
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
            })
            .addCase(loginStudent.rejected, (state) => {
                state.loading = false;
                state.error = 'Invalid student credentials';
            })
            .addCase(loadUserFromStorage.fulfilled, (state, action) => {
                state.token = action.payload?.token || null;
                state.userType = action.payload?.userType || null;
                state.student = action.payload?.student || null;
            });
    },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;