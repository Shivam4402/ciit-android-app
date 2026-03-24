import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loginApi } from './services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const loginUser = createAsyncThunk(
    'auth/loginUser',
    async (data, { rejectWithValue }) => {
        try {
            const response = await loginApi(data);

            const token = response.token || response.Token;

            await AsyncStorage.setItem('token', token);

            return { token };
        } catch (error) {
            return rejectWithValue('Login failed');
        }
    }
);

export const loadUserFromStorage = createAsyncThunk(
  'auth/loadUser',
  async () => {
    const token = await AsyncStorage.getItem('token');
    return token;
  }
);

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        token: null,
        loading: false,
        error: null,
    },
    reducers: {
        logout: (state) => {
            state.token = null;
            // AsyncStorage.removeItem('token');
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.token = action.payload.token;
            })
            .addCase(loginUser.rejected, (state) => {
                state.loading = false;
                state.error = 'Invalid credentials';
            })
            .addCase(loadUserFromStorage.fulfilled, (state, action) => {
                state.token = action.payload;
            });
    },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;