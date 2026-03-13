import React, { useEffect } from 'react';
import { Sidebar, ControlBar } from './components/Layout';
import { StageViewport } from './components/Stage';
import { useStore } from './state/useStore';
import { Login } from './components/Login';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { Disc } from 'lucide-react';

export default function App() {
  const { 
    user, setUser, isAuthLoading, setAuthLoading,
    setSongs, setFigures, setSelectedFigureId
  } = useStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Sync user profile
        const userRef = doc(db, 'users', firebaseUser.uid);
        await setDoc(userRef, {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          lastLogin: new Date().toISOString()
        }, { merge: true });

        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync Data from Firestore
  useEffect(() => {
    if (!user) return;

    // Sync Songs
    const songsQuery = collection(db, 'users', user.uid, 'songs');
    const unsubSongs = onSnapshot(songsQuery, (snapshot) => {
      const songsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setSongs(songsData);
    });

    // Sync Figures
    const figuresQuery = collection(db, 'users', user.uid, 'figures');
    const unsubFigures = onSnapshot(figuresQuery, (snapshot) => {
      const figuresData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setFigures(figuresData);
      
      // Select first figure if none selected
      if (figuresData.length > 0 && !useStore.getState().selectedFigureId) {
        setSelectedFigureId(figuresData[0].id);
      }
    });

    return () => {
      unsubSongs();
      unsubFigures();
    };
  }, [user]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Disc className="text-accent-cool animate-spin-slow" size={48} />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg-primary">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <StageViewport />
      </div>
      <ControlBar />
    </div>
  );
}
