import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { puedeAcceder } from '../services/registration.service';
import { otpGateway } from '../services/otp.gateway';
import RegisterScreen from '../screens/auth/RegisterScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RecoverPasswordScreen from '../screens/auth/RecoverPasswordScreen';
import VerificationScreen from '../screens/auth/VerificationScreen';
import RestrictedAccessScreen from '../screens/auth/RestrictedAccessScreen';
import StartScreen from '../screens/StartScreen';
import AdminScreen from '../screens/admin/AdminScreen';
import CreateReportScreen from '../screens/reports/CreateReportScreen';
import MapScreen from '../screens/map/MapScreen';
import MyReportsScreen from '../screens/reports/MyReportsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useTheme } from '../theme/ThemeProvider';

export default function RootNavigator() {
  const { colors } = useTheme();
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(undefined);
  const [authMode, setAuthMode] = useState('register');
  const [showCreateReport, setShowCreateReport] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

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
      setShowCreateReport(false);
      setShowMap(false);
      setShowHistory(false);
      setShowNotifications(false);
      setShowProfile(false);
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
    return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!user) {
    if (authMode === 'recover') return <RecoverPasswordScreen onBack={() => setAuthMode('login')} />;
    if (authMode === 'login') {
      return <LoginScreen onRegister={() => setAuthMode('register')} onForgotPassword={() => setAuthMode('recover')} />;
    }
    return <RegisterScreen otpGateway={otpGateway} onLogin={() => setAuthMode('login')} />;
  }
  if (!puedeAcceder(user, profile)) {
    return <VerificationScreen user={user} otpGateway={otpGateway} onUseAnotherAccount={handleSignOut} />;
  }
  if (profile?.rol === 'administrador') return <AdminScreen onSignOut={handleSignOut} />;
  if (profile?.rol === 'ciudadano') {
    if (showProfile) return <ProfileScreen onBack={() => setShowProfile(false)} />;
    if (showCreateReport) return <CreateReportScreen user={user} onBack={() => setShowCreateReport(false)} />;
    if (showMap) return <MapScreen onBack={() => setShowMap(false)} />;
    if (showHistory) return <MyReportsScreen onBack={() => setShowHistory(false)} />;
    if (showNotifications) return <NotificationsScreen uid={user.uid} onBack={() => setShowNotifications(false)} />;
    return (
      <StartScreen
        user={user}
        onSignOut={handleSignOut}
        onCreateReport={() => setShowCreateReport(true)}
        onOpenMap={() => setShowMap(true)}
        onOpenHistory={() => setShowHistory(true)}
        onOpenNotifications={() => setShowNotifications(true)}
        onOpenProfile={() => setShowProfile(true)}
      />
    );
  }
  return <RestrictedAccessScreen onSignOut={handleSignOut} />;
}
