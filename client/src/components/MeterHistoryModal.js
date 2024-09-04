import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';

function MeterHistoryModal({ meterId, meterType, onClose, onEditReading, userRole }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await apiService.get(`/meter-history/${meterType}/${meterId}`);
        setHistory(response.data);
      } catch (error) {
        console.error('Error fetching meter history:', error);
      }
    };
    fetchHistory();
  }, [meterId, meterType]);

  const canEdit = (readingTime) => {
    if (userRole === 'data_manager') return true;
    const now = new Date();
    const readingDate = new Date(readingTime);
    const hoursSinceReading = (now - readingDate) / (1000 * 60 * 60);
    return hoursSinceReading <= 24;
  };

  return (
    <div className="modal">
      <h2>電表歷史記錄</h2>
      <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>讀數時間</th>
              <th>讀數</th>
              <th>用電量</th>
              <th>照片</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {history.map((record) => (
              <tr key={record.id} style={{ height: '25px' }}> {/* Adjust the height value as needed */}
                <td>{new Date(record.reading_time).toLocaleString()}</td>
                <td>{record.reading_value}</td>
                <td>{record.difference}</td>
                <td>
                  {record.photo_url && (
                    <a href={record.photo_url} target="_blank" rel="noopener noreferrer">
                      查看照片
                    </a>
                  )}
                </td>
                <td>
                  {canEdit(record.reading_time) && (
                    <button onClick={() => onEditReading(record)}>修改</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={onClose}>關閉</button>
    </div>
  );
}

export default MeterHistoryModal;
