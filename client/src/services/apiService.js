import axios from 'axios';

const apiService = axios.create({
  baseURL: 'http://localhost:3001', // 替換為您的 API 基礎 URL http://192.168.233.160:3001 http://localhost:3001
  timeout: 3000, // 設置請求超時時間為 3000 毫秒 (3 秒)
});

apiService.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/*apiService.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        switch (error.response.status) {
          case 401:
            // 未授權，清除 token 並重定向到登錄頁面
            localStorage.removeItem('token');
            window.location.href = '/login';
            break;
          case 403:
            // 禁止訪問
            alert('您沒有權限執行此操作');
            break;
          default:
            // 其他錯誤
            alert('發生錯誤：' + error.response.data.message);
        }
      } else if (error.request) {
        // 請求已經發出，但沒有收到響應
        alert('無法連接到服務器，請檢查您的網絡連接');
      } else {
        // 在設置請求時發生了一些事情，觸發了錯誤
        alert('發生錯誤：' + error.message);
      }
      return Promise.reject(error);
    }
  );*/
  
export default apiService;