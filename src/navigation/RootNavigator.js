import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { puedeAcceder } from '../services/registration.service';
import { otpGateway } from '../services/otp.gateway';
import RegisterScreen from '../screens/auth/RegisterScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import VerificationScreen from '../screens/auth/VerificationScreen';
import StartScreen from '../screens/StartScreen';
import AdminScreen from '../screens/admin/AdminScreen';

export default function RootNavigator() {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(undefined);
  const [authMode, setAuthMode] = useState('register');

  async function handleSignOut() {
    await signOut(auth);
    setAuthMode('login');
  }

  useEffect(() => {
    let stopProfile = () => {};
    let sessionVersion = 0;
    const stopAuth = onAuthStateChanged(auth, (currentUser) => {
      const version = ++sessionVersion;
      stopProfile();
      stopProfile = () => {};
      setUser(currentUser);
      setProfile(currentUser ? undefined : null);
      if (currentUser) {
        stopProfile = onSnapshot(
          doc(db, 'usuarios', currentUser.uid),
          (snapshot) => {
            if (version === sessionVersion) setProfile(snapshot.exists() ? snapshot.data() : null);
          },
          () => {
            if (version === sessionVersion) setProfile(null);
          },
        );
      }
    });

    return () => {
      sessionVersion++;
      stopProfile();
      stopAuth();
    };
  }, []);

  if (user === undefined || (user && profile === undefined)) {
    return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" color="#0057FF" /></View>;
  }

  if (!user) {
    if (authMode === 'login') return <LoginScreen onRegister={() => setAuthMode('register')} />;
    return <RegisterScreen otpGateway={otpGateway} onLogin={() => setAuthMode('login')} />;
  }
  if (!puedeAcceder(user, profile)) {
    return <VerificationScreen user={user} otpGateway={otpGateway} onUseAnotherAccount={handleSignOut} />;
  }
  if (profile?.rol === 'administrador') return <AdminScreen onSignOut={handleSignOut} />;
  return <StartScreen onSignOut={handleSignOut} />;
}
