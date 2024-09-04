import Axios from 'axios';
import apiService from './apiService'; // 导入 apiService
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('imageDB', 2);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('formData')) {
        const objectStore = db.createObjectStore('formData', { keyPath: 'id', autoIncrement: true }); // 使用 autoIncrement 生成唯一主键
        objectStore.createIndex('meter_id', 'meter_id', { unique: false }); // 创建一个非唯一索引
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
};




export const storeFormData = async (formData) => {
  const db = await openDB();
  const transaction = db.transaction('formData', 'readwrite');
  const store = transaction.objectStore('formData');
  store.add(formData);  // Change from `put` to `add`
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject(event.target.error);
  });
};
  

export const getAllOfflineData = async () => {
  const db = await openDB();
  const transaction = db.transaction('formData', 'readonly');
  const store = transaction.objectStore('formData');
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
};
  


export const deleteFormDataByMeterId = async (meterId) => {
  const db = await openDB();
  const transaction = db.transaction('formData', 'readwrite');
  const store = transaction.objectStore('formData');
  
  const index = store.index('meter_id'); // 假设你为 meter_id 创建了一个索引
  const request = index.openCursor(IDBKeyRange.only(meterId));
  
  request.onsuccess = (event) => {
    const cursor = event.target.result;
    if (cursor) {
      cursor.delete();  // 删除当前指向的记录
      cursor.continue();  // 继续遍历其他同 meter_id 的记录
    }
  };

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject(event.target.error);
  });
};

  
export const retryUpload = async (formData) => {
  try {
    const response = await apiService.post('/update-meter-reading', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    // 成功上传后，删除该条数据
    await deleteFormDataByMeterId(formData.meter_id);

    console.log('Upload successful:', response.data);
  } catch (error) {
    console.error('Retry upload failed:', error);
  }
};
