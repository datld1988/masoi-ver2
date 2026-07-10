'use strict';
/* Cấu hình Firebase – lấy từ Firebase Console (Project settings → Web app)
   ⚠️ QUAN TRỌNG: cần tạo Realtime Database trong Console (Build → Realtime Database
   → Create database), rồi dán URL của nó vào databaseURL bên dưới.
   URL có dạng: https://masoi-online-9e660-default-rtdb.asia-southeast1.firebasedatabase.app
   (hoặc ...-default-rtdb.firebaseio.com nếu chọn region US) */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBgzbAxAiK3Xqju9Ubw7T_uxaj5tTX5p6c",
  authDomain: "masoi-online-9e660.firebaseapp.com",
  databaseURL: "https://masoi-online-9e660-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "masoi-online-9e660",
  storageBucket: "masoi-online-9e660.firebasestorage.app",
  messagingSenderId: "450466353519",
  appId: "1:450466353519:web:f8bc9c07aeb8aa1659989a",
};
// Link người chơi mở (sau khi deploy Firebase Hosting). Có thể sửa trong màn hình host.
const PLAYER_BASE_URL = "https://masoi-online-9e660.web.app/player.html";
