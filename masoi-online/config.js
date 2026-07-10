'use strict';
/* Cấu hình Firebase – TỰ CHỌN theo tên miền đang phục vụ:
     - .../masoi-staging.web.app        → project STAGING (sân tập)
     - .../masoi-online-9e660.web.app   → project PROD (thật)
     - mở file cục bộ (file://) hoặc khác → mặc định PROD
   Key web của Firebase là công khai (bảo mật nằm ở Anonymous Auth + Database Rules),
   nên để cả hai bộ ở đây là an toàn. Deploy CÙNG bộ code lên project nào cũng tự nối đúng. */

const FIREBASE_CONFIGS = {
  prod: {
    apiKey: "AIzaSyBgzbAxAiK3Xqju9Ubw7T_uxaj5tTX5p6c",
    authDomain: "masoi-online-9e660.firebaseapp.com",
    databaseURL: "https://masoi-online-9e660-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "masoi-online-9e660",
    storageBucket: "masoi-online-9e660.firebasestorage.app",
    messagingSenderId: "450466353519",
    appId: "1:450466353519:web:f8bc9c07aeb8aa1659989a",
  },
  staging: {
    apiKey: "AIzaSyDB2jFNX7zY4Q00Y7sDro8Y4vb2i8VKxD8",
    authDomain: "masoi-staging.firebaseapp.com",
    databaseURL: "https://masoi-staging-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "masoi-staging",
    storageBucket: "masoi-staging.firebasestorage.app",
    messagingSenderId: "121099793846",
    appId: "1:121099793846:web:a5a6f655ef9f8ca00ebd17",
    measurementId: "G-X4CXSBH9V7",
  },
};

// Tên miền chứa "masoi-staging" → staging, còn lại (kể cả mở file cục bộ) → prod
const MASOI_ENV = (typeof location !== 'undefined' && /masoi-staging/i.test(location.hostname)) ? 'staging' : 'prod';
const FIREBASE_CONFIG = FIREBASE_CONFIGS[MASOI_ENV];

// Link người chơi mở (khớp theo môi trường). Có thể sửa trong màn hình host.
const PLAYER_BASE_URL = (MASOI_ENV === 'staging')
  ? "https://masoi-staging.web.app/player.html"
  : "https://masoi-online-9e660.web.app/player.html";
