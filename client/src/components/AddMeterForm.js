import React, { useState } from 'react';

function AddMeterForm({ meterType, campuses, onAddMeter }) {
    const [meterData, setMeterData] = useState({
      meter_number: '',
      location: '',
      campus_id: '',
      brand: '',
      display_unit: '',
      ct_value: '',
      wiring_method: ''
    });
  
    const handleSubmit = (e) => {
      e.preventDefault();
      onAddMeter(meterType, meterData);
    };
    function handleUnitChange(e, unit) {
      const updatedUnits = e.target.checked
        ? [...meterData.display_unit.split(','), unit].filter(Boolean).join(',')
        : meterData.display_unit.split(',').filter(u => u !== unit).join(',');
      setMeterData({...meterData, display_unit: updatedUnits});
    }
  
    return (
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={meterData.meter_number}
          onChange={(e) => setMeterData({...meterData, meter_number: e.target.value})}
          placeholder="電表號"
          required
        />
        <input
          type="text"
          value={meterData.location}
          onChange={(e) => setMeterData({...meterData, location: e.target.value})}
          placeholder="位置"
          required
        />
        <select
          value={meterData.campus_id}
          onChange={(e) => setMeterData({...meterData, campus_id: e.target.value})}
          required
        >
          <option value="">選擇校區</option>
          {campuses.map(campus => (
            <option key={campus.id} value={campus.id}>{campus.name}</option>
          ))}
        </select>
        {meterType === 'digital' ? (
          <>
            <select
              value={meterData.brand}
              onChange={(e) => setMeterData({...meterData, brand: e.target.value})}
              required
            >
              <option value="">選擇廠牌</option>
              <option value="1">施耐德</option>
              <option value="2">其他</option>
            </select>
            <div>
              顯示單位：
              <label><input type="checkbox" name="Wh" onChange={(e) => handleUnitChange(e, 'Wh')} /> Wh</label>
              <label><input type="checkbox" name="VAh" onChange={(e) => handleUnitChange(e, 'VAh')} /> VAh</label>
              <label><input type="checkbox" name="VARh" onChange={(e) => handleUnitChange(e, 'VARh')} /> VARh</label>
            </div>
          </>
        ) : (
          <>
            <select
              value={meterData.ct_value}
              onChange={(e) => setMeterData({...meterData, ct_value: e.target.value})}
              required
            >
              <option value="">選擇 CT 值</option>
              <option value="1">有裝電比值</option>
              <option value="2">沒有</option>
            </select>
            <input
              type="text"
              value={meterData.wiring_method}
              onChange={(e) => setMeterData({...meterData, wiring_method: e.target.value})}
              placeholder="電壓接線方式"
            />
          </>
        )}
        <button type="submit">添加電表</button>
      </form>
    );
  }
  export default AddMeterForm;