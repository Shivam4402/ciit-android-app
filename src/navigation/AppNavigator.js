import React from 'react';
import { useSelector } from 'react-redux';
import PublicNavigator from './PublicNavigator';
import PrivateNavigator from './PrivateNavigator';


const AppNavigator = () => {

  const token = useSelector((state) => state.auth.token);
  return token ? <PrivateNavigator /> : <PublicNavigator />;

};


export default AppNavigator;