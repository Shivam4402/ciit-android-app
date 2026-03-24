import React, { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { store } from './src/store/store';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { loadUserFromStorage } from './src/features/auth/authSlice';

const Root = () => {
  const dispatch = useDispatch<typeof store.dispatch>();

  useEffect(() => {
    dispatch(loadUserFromStorage());
  }, [dispatch]);

  return <AppNavigator />;
};

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <Root />
      </NavigationContainer>
    </Provider>
  );
}