import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyBUk2XTJAlUqPWUEYmwXIDb31ke9z2rJuo',
  authDomain: 'opentripzaza.firebaseapp.com',
  projectId: 'opentripzaza',
  storageBucket: 'opentripzaza.firebasestorage.app',
  messagingSenderId: '821957428670',
  appId: '1:821957428670:web:e41bbd5644fd273ca3e5ef',
  measurementId: 'G-PZCYXNL7WQ',
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

isSupported().then((supported) => {
  if (supported) getAnalytics(app)
})
