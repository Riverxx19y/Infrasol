import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { puedeAcceder } from '../services/registration.service';
import { otpGateway } from '../services/otp.gateway';
import RegisterScreen from '../screens/auth/RegisterScreen';
import VerificationScreen from '../screens/auth/VerificationScreen';
import StartScreen from '../screens/StartScreen';

export default function RootNavigator() {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(undefined);

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

  if (!user) return <RegisterScreen otpGateway={otpGateway} />;
  if (!puedeAcceder(user, profile)) {
    return <VerificationScreen user={user} otpGateway={otpGateway} onUseAnotherAccount={() => signOut(auth)} />;
  }
  return <StartScreen />;
}
