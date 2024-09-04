import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import AddMeterForm from './AddMeterForm';
import MeterHistoryModal from './MeterHistoryModal';

function DataManagerView({ user }) {
    const [campuses, setCampuses] = useState([]);
    const [selectedCampus, setSelectedCampus] = useState('');
    const [selectedMeterType, setSelectedMeterType] = useState('');
    const [meters, setMeters] = useState([]);
    const [selectedMeter, setSelectedMeter] = useState(null);
    const [showAddMeterForm, setShowAddMeterForm] = useState(false);
    const [showAddCampusForm, setShowAddCampusForm] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [newCampusName, setNewCampusName] = useState('');
    const [editedMeterInfo, setEditedMeterInfo] = useState({
      brand: '',
      display_unit: [],
      ct_value: '',
      wiring_method: ''
    });
    const [showEditReadingModal, setShowEditReadingModal] = useState(false);
    const [selectedReading, setSelectedReading] = useState(null);
    const [newReadingValue, setNewReadingValue] = useState('');
    const [newMeterType, setNewMeterType] = useState('');
  
    useEffect(() => {
      fetchCampuses();
    }, []);
  
    useEffect(() => {
      if (selectedCampus && selectedMeterType) {
        fetchMeters();
      }
    }, [selectedCampus, selectedMeterType]);
  
    useEffect(() => {
      if (selectedMeter) {
        setEditedMeterInfo({
          brand: selectedMeter.brand || '',
          display_unit: selectedMeter.display_unit ? selectedMeter.display_unit.split(',') : [],
          ct_value: selectedMeter.ct_value || '',
          wiring_method: selectedMeter.wiring_method || ''
        });
      }
    }, [selectedMeter]);
  
    const fetchCampuses = async () => {
      try {
        const response = await apiService.get('/campuses');
        setCampuses(response.data);
      } catch (error) {
        console.error('Error fetching campuses:', error);
      }
    };
  
    const fetchMeters = async () => {
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
  
    const handleAddMeter = async (meterType, meterData) => {
      try {
        const endpoint = meterType === 'digital' ? '/digital-meters' : '/mechanical-meters';
        await apiService.post(endpoint, meterData);
        alert('電表添加成功');
        setShowAddMeterForm(false);
        fetchMeters();
      } catch (error) {
        console.error('Error adding meter:', error);
        alert('添加電表失敗：' + (error.response?.data || error.message));
      }
    };
  
    const handleAddCampus = async (e) => {
      e.preventDefault();
      try {
        await apiService.post('/campuses', { name: newCampusName });
        alert('校區添加成功');
        setShowAddCampusForm(false);
        setNewCampusName('');
        fetchCampuses();
      } catch (error) {
        console.error('Error adding campus:', error);
        alert('添加校區失敗：' + (error.response?.data || error.message));
      }
    };
  
    const handleDisplayUnitChange = (unit) => {
      setEditedMeterInfo(prevInfo => {
        const updatedUnits = prevInfo.display_unit.includes(unit)
          ? prevInfo.display_unit.filter(u => u !== unit)
          : [...prevInfo.display_unit, unit];
        return { ...prevInfo, display_unit: updatedUnits };
      });
    };
  
    const handleEditMeter = async (e) => {
      e.preventDefault();
      try {
        const endpoint = selectedMeterType === 'digital' ? '/digital-meters' : '/mechanical-meters';
        const updatedMeterInfo = {
          ...editedMeterInfo,
          display_unit: editedMeterInfo.display_unit.join(',')
        };
        await apiService.put(`${endpoint}/${selectedMeter.id}`, updatedMeterInfo);
        alert('電表信息更新成功');
        fetchMeters();
      } catch (error) {
        console.error('Error updating meter:', error);
        alert('更新電表失敗：' + (error.response?.data || error.message));
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
        alert('更新失敗：' + (error.response?.data?.message || error.message));
      }
    };
    

    const renderEditMeterForm = () => {
      if (!selectedMeter) return null;

      const commonFields = (
          <>
              <div>電表號: {selectedMeter.meter_number}</div>
              <div>位置: {selectedMeter.location}</div>
          </>
      );

      if (selectedMeterType === 'digital') {
          return (
              <form onSubmit={handleEditMeter}>
                  <h3>編輯數位式電表信息</h3>
                  {commonFields}
                  <div>
                      <label>廠牌: </label>
                      <select
                          value={editedMeterInfo.brand}
                          onChange={e => setEditedMeterInfo({...editedMeterInfo, brand: e.target.value})}
                      >
                          <option value="">選擇廠牌</option>
                          <option value="1">施耐德</option>
                          <option value="2">其他</option>
                      </select>
                  </div>
                  <div>
                      <label>顯示單位: </label>
                      {['Wh', 'VAh', 'VARh'].map(unit => (
                          <label key={unit}>
                              <input
                                  type="checkbox"
                                  checked={editedMeterInfo.display_unit.includes(unit)}
                                  onChange={() => handleDisplayUnitChange(unit)}
                              /> {unit}
                          </label>
                      ))}
                  </div>
                  <button type="submit">更新電表信息</button>
              </form>
          );
      } else if (selectedMeterType === 'mechanical') {
          return (
              <form onSubmit={handleEditMeter}>
                  <h3>編輯機械式電表信息</h3>
                  {commonFields}
                  <div>
                      <label>CT值: </label>
                      <select
                          value={editedMeterInfo.ct_value}
                          onChange={e => setEditedMeterInfo({...editedMeterInfo, ct_value: e.target.value})}
                      >
                          <option value="">選擇 CT 值</option>
                          <option value="1">有裝電比值</option>
                          <option value="2">沒有</option>
                      </select>
                  </div>
                  <div>
                      <label>電壓接線方式: </label>
                      <input 
                          type="text" 
                          value={editedMeterInfo.wiring_method}
                          onChange={e => setEditedMeterInfo({...editedMeterInfo, wiring_method: e.target.value})}
                          placeholder="電壓接線方式"
                      />
                  </div>
                  <button type="submit">更新電表信息</button>
              </form>
          );
      }
  };

  return (
      <div>
          <h2>電表管理系統</h2>
          
          {/* 電表管理區塊 */}
          <div>
              <h3>電表管理</h3>
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
                  <button onClick={() => setShowHistory(true)}>查看歷史記錄</button>
              )}
              {renderEditMeterForm()}
          </div>

          {/* 電表歷史記錄 */}
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

          {/* 新增校區區塊 */}
          <div>
              <h3>新增校區</h3>
              <button onClick={() => setShowAddCampusForm(true)}>新增校區</button>
              {showAddCampusForm && (
                  <div>
                      <form onSubmit={handleAddCampus}>
                          <input
                              type="text"
                              value={newCampusName}
                              onChange={e => setNewCampusName(e.target.value)}
                              placeholder="輸入新校區名稱"
                              required
                          />
                          <button type="submit">添加校區</button>
                      </form>
                      <button onClick={() => setShowAddCampusForm(false)}>關閉</button>
                  </div>
              )}
          </div>

          {/* 新增電表區塊 */}
          <div>
              <h3>新增電表</h3>
              <button onClick={() => setShowAddMeterForm(true)}>新增電表</button>
              {showAddMeterForm && (
                  <div>
                      <select onChange={e => setNewMeterType(e.target.value)} value={newMeterType}>
                          <option value="">選擇電表類型</option>
                          <option value="digital">數位式</option>
                          <option value="mechanical">機械式</option>
                      </select>
                      {newMeterType && (
                          <AddMeterForm
                              meterType={newMeterType}
                              campuses={campuses}
                              onAddMeter={handleAddMeter}
                          />
                      )}
                      <button onClick={() => {
                          setShowAddMeterForm(false);
                          setNewMeterType('');
                      }}>關閉</button>
                  </div>
              )}
          </div>

          {/* 編輯讀數模態框 */}
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

export default DataManagerView;