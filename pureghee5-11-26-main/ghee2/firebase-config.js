// Firebase Configuration for Amrutha Pure Ghee Store
// Live Google Cloud Firebase Realtime Database Active

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyC0N_wj_gNPyHoc4sVETvfOitiLnpbMVKs",
    authDomain: "amrutha-pure-ghee.firebaseapp.com",
    databaseURL: "https://amrutha-pure-ghee-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "amrutha-pure-ghee",
    storageBucket: "amrutha-pure-ghee.firebasestorage.app",
    messagingSenderId: "481085631416",
    appId: "1:481085631416:web:8dc46bb6cfe075fa1cfd4d"
};

// Admin Config
const ADMIN_CONFIG = {
    dashboardPassword: "saikrishnafoodproducts@123"
};

// Export to window object
if (typeof window !== 'undefined') {
    window.firebaseConfig = FIREBASE_CONFIG;
    window.adminConfig = ADMIN_CONFIG;
}
