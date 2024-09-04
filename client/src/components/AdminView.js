import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';

function AdminView({ user }) {
    const [users, setUsers] = useState([]);
    const [showAddUserForm, setShowAddUserForm] = useState(false);
    const [newUser, setNewUser] = useState({
      username: '',
      password: '',
      role: ''
    });
    const [error, setError] = useState('');
  
    useEffect(() => {
      fetchUsers();
    }, []);
  
    const fetchUsers = async () => {
      try {
        const response = await apiService.get('/users');
        setUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('獲取用戶列表失敗');
      }
    };
  
    const handleAddUser = async (e) => {
      e.preventDefault();
      setError('');
      
      if (!newUser.username || !newUser.password || !newUser.role) {
        setError('請填寫所有必填字段');
        return;
      }
  
      try {
        await apiService.post('/users', newUser);
        alert('用戶添加成功');
        setShowAddUserForm(false);
        setNewUser({ username: '', password: '', role: '' });
        fetchUsers();
      } catch (error) {
        console.error('Error adding user:', error);
        setError('添加用戶失敗：' + (error.response?.data?.message || error.message));
      }
    };
  
    const handleDeleteUser = async (userId) => {
      try {
        await apiService.delete(`/users/${userId}`);
        alert('用戶刪除成功');
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        setError('刪除用戶失敗：' + (error.response?.data?.message || error.message));
      }
    };
  
    return (
      <div>
        <h2>用戶管理</h2>
        <button onClick={() => setShowAddUserForm(true)}>新增用戶</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <table>
          <thead>
            <tr>
              <th>用戶名</th>
              <th>角色</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.role}</td>
                <td>
                  <button onClick={() => handleDeleteUser(user.id)}>刪除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {showAddUserForm && (
          <form onSubmit={handleAddUser}>
            <h3>新增用戶</h3>
            <div>
              <label htmlFor="username">用戶名：</label>
              <input
                type="text"
                id="username"
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                required
              />
            </div>
            <div>
              <label htmlFor="password">密碼：</label>
              <input
                type="password"
                id="password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                required
              />
            </div>
            <div>
              <label htmlFor="role">角色：</label>
              <select
                id="role"
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                required
              >
                <option value="">選擇角色</option>
                <option value="admin">管理員</option>
                <option value="data_manager">數據管理員</option>
                <option value="reader">讀表員</option>
              </select>
            </div>
            <button type="submit">添加用戶</button>
            <button type="button" onClick={() => setShowAddUserForm(false)}>取消</button>
          </form>
        )}
      </div>
    );
  }

export default AdminView;