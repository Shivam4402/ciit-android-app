import React from 'react';
import { useSelector } from 'react-redux';
import PublicNavigator from './PublicNavigator';
import PrivateNavigator from './PrivateNavigator';
import StudentPrivateNavigator from './StudentPrivateNavigator';


const AppNavigator = () => {

  const token = useSelector((state) => state.auth.token);
  const userType = useSelector((state) => state.auth.userType);

  if (!token) {
    return <PublicNavigator />;
  }

  if (userType === 'student') {
    return <StudentPrivateNavigator />;
  }

  return <PrivateNavigator />;

};


export default AppNavigator;