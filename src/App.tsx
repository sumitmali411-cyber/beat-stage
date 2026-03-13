import React, { useEffect } from 'react';
import { Sidebar, ControlBar } from './components/Layout';
import { StageViewport } from './components/Stage';
import { useStore } from './state/useStore';
import { Login } from './components/Login';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore';
import { Disc } from 'lucide-react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const { 
    user, setUser, isAuthLoading, setAuthLoading,
    setSongs, setFigures, setSelectedFigureId, setPresets
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
    const unsubSongs = onSnapshot(songsQuery, async (snapshot) => {
      let songsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      // Check for invalid blob URLs
      const validSongs = [];
      for (const song of songsData) {
        if (song.url?.startsWith('blob:')) {
          try {
            const res = await fetch(song.url);
            if (!res.ok) throw new Error('Invalid blob');
            validSongs.push(song);
          } catch (e) {
            console.warn('Deleting invalid song blob:', song.id);
            await deleteDoc(doc(db, 'users', user.uid, 'songs', song.id));
          }
        } else {
          validSongs.push(song);
        }
      }
      
      setSongs(validSongs);
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/songs`));

    // Sync Figures
    const figuresQuery = collection(db, 'users', user.uid, 'figures');
    const unsubFigures = onSnapshot(figuresQuery, async (snapshot) => {
      let figuresData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      // Check for invalid blob URLs
      const validFigures = [];
      for (const fig of figuresData) {
        if (fig.url?.startsWith('blob:')) {
          try {
            const res = await fetch(fig.url);
            if (!res.ok) throw new Error('Invalid blob');
            validFigures.push(fig);
          } catch (e) {
            console.warn('Deleting invalid figure blob:', fig.id);
            await deleteDoc(doc(db, 'users', user.uid, 'figures', fig.id));
          }
        } else {
          validFigures.push(fig);
        }
      }

      setFigures(validFigures);
      
      // Select first figure if none selected
      if (validFigures.length > 0 && !useStore.getState().selectedFigureId) {
        setSelectedFigureId(validFigures[0].id);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/figures`));

    // Sync Presets
    const presetsQuery = collection(db, 'users', user.uid, 'presets');
    const unsubPresets = onSnapshot(presetsQuery, (snapshot) => {
      const presetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setPresets(presetsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/presets`));

    return () => {
      unsubSongs();
      unsubFigures();
      unsubPresets();
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
