import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import MeterHistoryModal from './MeterHistoryModal';
import { storeFormData } from '../services/offlineService';

function ReaderView({ user }) {
    const [campuses, setCampuses] = useState([]);
    const [selectedCampus, setSelectedCampus] = useState('');
    const [selectedMeterType, setSelectedMeterType] = useState('');
    const [meters, setMeters] = useState([]);
    const [selectedMeter, setSelectedMeter] = useState(null);
    const [reading, setReading] = useState('');
    const [photo, setPhoto] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [showEditReadingModal, setShowEditReadingModal] = useState(false);
    const [selectedReading, setSelectedReading] = useState(null);
    const [newReadingValue, setNewReadingValue] = useState('');
    const [fileInputKey, setFileInputKey] = useState(Date.now()); // 用于强制重新渲染文件输入框
    useEffect(() => {
      fetchCampuses();
    }, []);
  
    const fetchCampuses = async () => {
      try {
        const response = await apiService.get('/campuses');
        setCampuses(response.data);
      } catch (error) {
        console.error('Error fetching campuses:', error);
      }
    };
  
    const fetchMeters = async () => {
      if (!selectedCampus || !selectedMeterType) return;
      try {
        const response = await apiService.get('/meters');
        const filteredMeters = response.data.filter(meter => 
          meter.campus_id === parseInt(selectedCampus) && 
          meter.meter_type === selectedMeterType
        );
        setMeters(filteredMeters);
      } catch (error) {
        console.error('Error fetching meters:', error);
      }
    };
  
    useEffect(() => {
      fetchMeters();
    }, [selectedCampus, selectedMeterType]);
  
    const handleReadingSubmit = async (e) => {
        e.preventDefault();
        if (!selectedMeter || !reading) {
          alert('請選擇電表並輸入度數');
          return;
        }
      
        const formData = new FormData();
        formData.append('meter_id', selectedMeter.meter_number);
        formData.append('meter_type', selectedMeterType);
        formData.append('reading_value', reading);
        if (photo) {
          formData.append('photo', photo);
        }
      
        try {
          const response = await apiService.post('/update-meter-reading', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          alert('讀數更新成功');
          setReading('');
          setPhoto(null);
          setFileInputKey(Date.now()); // 重置文件输入框
          fetchMeters();
        } catch (error) {
          console.error('Error updating reading:', error);
          // Store form data in IndexedDB for retry later
          try {
            await storeFormData({
              meter_id: selectedMeter.meter_number,
              meter_type: selectedMeterType,
              reading_value: reading,
              photo: photo
            });
            alert('數據已儲存離線，稍後將自動重新上傳');
          } catch (storeError) {
            console.error('Error storing offline data:', storeError);
            alert('數據儲存失敗：' + storeError.message);
          }
        }
      };

    const handleEditReading = async () => {
        try {
          const response = await apiService.put(`/update-meter-reading/${selectedMeter.meter_number}/${selectedReading.id}`, {
            new_reading_value: newReadingValue,
            meter_type: selectedMeterType
          });
          alert('讀數更新成功');
          setShowEditReadingModal(false);
          fetchMeters();
        } catch (error) {
          console.error('Error updating reading:', error);
          console.error('Error response:', error.response);
          alert('更新失敗：' + (error.response?.data?.message || error.message));
        }
      };
    return (
      <div>
        <h2>更新電表讀數</h2>
        <select onChange={e => setSelectedCampus(e.target.value)} value={selectedCampus}>
          <option value="">選擇校區</option>
          {campuses.map(campus => (
            <option key={campus.id} value={campus.id}>{campus.name}</option>
          ))}
        </select>
        <select onChange={e => setSelectedMeterType(e.target.value)} value={selectedMeterType}>
          <option value="">選擇電表類型</option>
          <option value="digital">數位式</option>
          <option value="mechanical">機械式</option>
        </select>
        {selectedCampus && selectedMeterType && (
          <select onChange={e => setSelectedMeter(meters.find(m => m.id === parseInt(e.target.value)))}>
            <option value="">選擇電表</option>
            {meters.map(meter => (
              <option key={meter.id} value={meter.id}>{meter.meter_number}</option>
            ))}
          </select>
        )}
        {selectedMeter && (
          <form onSubmit={handleReadingSubmit}>
            <h3>電表號: {selectedMeter.meter_number}</h3>
            <div>
              <label>位置: {selectedMeter.location}</label>
            </div>
            <div>
              <label>新讀數: </label>
              <input 
                type="number" 
                value={reading} 
                onChange={e => setReading(e.target.value)} 
                placeholder="新電表度數" 
                required
              />
            </div>
            <div>
              <label>上傳照片: </label>
              <input 
                key={fileInputKey} // 使用 key 强制重新渲染
                type="file" 
                onChange={e => setPhoto(e.target.files[0])} 
                accept="image/*"
              />
            </div>
            <button type="button" onClick={() => setShowHistory(true)}>查看歷史記錄</button>
            <button type="submit">更新讀數</button>
          </form>
        )}
        {showHistory && selectedMeter && (
          <MeterHistoryModal 
            meterId={selectedMeter.meter_number}
            meterType={selectedMeterType}
            onClose={() => setShowHistory(false)}
            onEditReading={(reading) => {
                setSelectedReading(reading);
                setNewReadingValue(reading.reading_value);
                setShowEditReadingModal(true);
            }}
            userRole={user.role}
          />
        )}

        {showEditReadingModal && (
            <div className="modal">
            <h3>修改讀數</h3>
            <p>當前讀數: {selectedReading.reading_value}</p>
            <input
                type="number"
                value={newReadingValue}
                onChange={(e) => setNewReadingValue(e.target.value)}
                placeholder="新讀數"
            />
            <button onClick={handleEditReading}>確認修改</button>
            <button onClick={() => setShowEditReadingModal(false)}>取消</button>
            </div>
        )}
      </div>
    );
  }

export default ReaderView;