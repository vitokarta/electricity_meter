require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt'); //bcryptjs
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// app.use(cors({
//     origin: 'http://localhost:3000', // 替換為您的前端 URL
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],
//     allowedHeaders: ['Content-Type', 'Authorization']
//   }));

const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'karta2274233',
    database: 'meter_management',
    port: 3306,  // 显式指定端口
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 測試數據庫連接
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed: ' + err.message);
    } else {
        console.log('Successfully connected to the database.');
        connection.release();
    }
});

// 確保上傳目錄存在
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

console.log('Upload directory:', uploadDir);

// 文件上傳配置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("只支持上傳 jpg、jpeg 或 png 格式的圖片"));
    }
}).single('photo');

// 設置靜態文件服務
app.use('/uploads', express.static(uploadDir));

// 身份驗證中間件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// 角色權限中間件
const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        next();
    };
};

// 用戶登錄
app.post('/login', async (req, res) => {
    console.log('Login attempt:', req.body.username);
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [req.body.username]);
        console.log('Users found:', users.length);
        if (users.length > 0) {
            const user = users[0];
            const isMatch = await bcrypt.compare(req.body.password, user.password);
            console.log('Password match:', isMatch);
            if (isMatch) {
                const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);
                res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
            } else {
                res.status(400).send('Invalid credentials');
            }
        } else {
            res.status(400).send('User not found');
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).send(error.message);
    }
});

// 獲取校區列表
app.get('/campuses', async (req, res) => {
    try {
        const [campuses] = await pool.query('SELECT * FROM campuses');
        console.log('Sending campuses:', campuses);
        res.json(campuses);
    } catch (error) {
        console.error('Error fetching campuses:', error);
        res.status(500).send(error.message);
    }
});

// 獲取電表列表（更新為包含最新讀數信息）
app.get('/meters', async (req, res) => {
    try {
        const [digitalMeters] = await pool.query(`
            SELECT *, 'digital' as meter_type, 
            CASE 
                WHEN brand = '1' THEN '施耐德'
                WHEN brand = '2' THEN '其他'
                ELSE brand
            END as brand_name
            FROM digital_meters
        `);
        const [mechanicalMeters] = await pool.query(`
            SELECT *, 'mechanical' as meter_type,
            CASE 
                WHEN ct_value = '1' THEN '有裝電比值'
                WHEN ct_value = '2' THEN '沒有'
                ELSE ct_value
            END as ct_value_name
            FROM mechanical_meters
        `);
        const allMeters = [...digitalMeters, ...mechanicalMeters];
        res.json(allMeters);
    } catch (error) {
        console.error('Error fetching meters:', error);
        res.status(500).send(error.message);
    }
});

// 獲取特定電表的歷史記錄
app.get('/meter-history/:meterType/:meterId', async (req, res) => {
    try {
        const { meterType, meterId } = req.params;
        let tableName = meterType === 'digital' ? 'digital_meter_readings_history' : 'mechanical_meter_readings_history';
        
        const [history] = await pool.query(
            `SELECT * FROM ${tableName} WHERE meter_id = ? ORDER BY reading_time DESC`,
            [meterId]
        );
        res.json(history);
    } catch (error) {
        console.error('Error fetching meter history:', error);
        res.status(500).send(error.message);
    }
});

// 更新電表讀數
app.post('/update-meter-reading', function(req, res) {
    upload(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(500).json({ error: 'File upload error', details: err.message });
        } else if (err) {
            console.error('Unknown error:', err);
            return res.status(500).json({ error: 'Unknown error', details: err.message });
        }

        console.log('File upload successful');
        try {
            let { meter_id, meter_type, reading_value, brand, display_units, ct_value, wiring_method } = req.body;
            let photo_url = null;
            
            
            if (req.file) {
                photo_url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
                console.log('Generated photo URL:', photo_url);
            }

            let tableName = meter_type === 'digital' ? 'digital_meters' : 'mechanical_meters';
            let historyTableName = meter_type === 'digital' ? 'digital_meter_readings_history' : 'mechanical_meter_readings_history';

            const [meterInfo] = await pool.query(`SELECT * FROM ${tableName} WHERE meter_number = ?`, [meter_id]);
            if (meterInfo.length === 0) {
                return res.status(404).send('Meter not found');
            }

            const currentMeter = meterInfo[0];
            const lastReadingValue = currentMeter.current_reading || 0;
            const difference = reading_value - lastReadingValue;
            let updateQuery, updateValues;
            if (meter_type === 'digital') {
                if(brand === undefined)
                    brand = currentMeter.brand;
                if(display_units == undefined )
                    display_units = currentMeter.display_unit;
                updateQuery = `
                    UPDATE ${tableName} SET 
                    last_reading = current_reading,
                    last_reading_time = current_reading_time,
                    current_reading = ?,
                    current_reading_time = NOW(),
                    photo_url = ?,
                    difference = ?,
                    brand = ?,
                    display_unit = ?
                    WHERE meter_number = ?
                `;
                updateValues = [reading_value, photo_url, difference, brand, display_units, meter_id];
            } else {
                if(ct_value === undefined)
                    ct_value = currentMeter.ct_value;
                if(wiring_method === undefined)
                    wiring_method = currentMeter.wiring_method;
                updateQuery = `
                    UPDATE ${tableName} SET 
                    last_reading = current_reading,
                    last_reading_time = current_reading_time,
                    current_reading = ?,
                    current_reading_time = NOW(),
                    photo_url = ?,
                    difference = ?,
                    ct_value = ?,
                    wiring_method = ?
                    WHERE meter_number = ?
                `;
                updateValues = [reading_value, photo_url, difference, ct_value, wiring_method, meter_id];
            }

            await pool.query(updateQuery, updateValues);

            let historyQuery, historyValues;
            if (meter_type === 'digital') {
                historyQuery = `
                    INSERT INTO ${historyTableName} 
                    (meter_id, reading_value, reading_time, photo_url, difference, brand, display_unit) 
                    VALUES (?, ?, NOW(), ?, ?, ?, ?)
                `;
                historyValues = [meter_id, reading_value, photo_url, difference, brand, display_units];
            } else {
                historyQuery = `
                    INSERT INTO ${historyTableName} 
                    (meter_id, reading_value, reading_time, photo_url, difference, ct_value, wiring_method) 
                    VALUES (?, ?, NOW(), ?, ?, ?, ?)
                `;
                historyValues = [meter_id, reading_value, photo_url, difference, ct_value, wiring_method];
            }

            await pool.query(historyQuery, historyValues);

            res.status(200).send('Meter reading updated and history saved successfully');
        } catch (error) {
            console.error('Error updating meter reading:', error);
            res.status(500).send(error.message);
        }
    });
});

// 更新歷史電表讀數
app.put('/update-meter-reading/:meterId/:readingId', authenticateToken, authorize(['data_manager', 'reader']), async (req, res) => {
    upload(req, res, async function (err) {
        if (err) {
            return res.status(500).json({ error: 'File upload error', details: err.message });
        }

        const { meterId, readingId } = req.params;
        const { new_reading_value, meter_type } = req.body;
        const userRole = req.user.role;
        let photo_url = null;

        if (req.file) {
            photo_url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        }

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const tableName = meter_type === 'digital' ? 'digital_meters' : 'mechanical_meters';
            const historyTableName = meter_type === 'digital' ? 'digital_meter_readings_history' : 'mechanical_meter_readings_history';

            // 獲取原始讀數
            const [originalReading] = await conn.query(`SELECT * FROM ${historyTableName} WHERE id = ?`, [readingId]);
            if (originalReading.length === 0) {
                throw new Error('原始讀數不存在');
            }

            const newValue = parseFloat(new_reading_value);

            // 查找前一條讀數
            const [previousReading] = await conn.query(
                `SELECT * FROM ${historyTableName} WHERE meter_id = ? AND reading_time < ? ORDER BY reading_time DESC LIMIT 1`,
                [meterId, originalReading[0].reading_time]
            );

            let difference;
            if (previousReading.length === 0) {
                // 如果是第一條記錄，差額就是新值本身
                difference = newValue;
            } else {
                // 如果不是第一條記錄，差額應該是新值減去前一條讀數
                difference = newValue - parseFloat(previousReading[0].reading_value);
            }

            // 更新當前讀數
            await conn.query(
                `UPDATE ${historyTableName} SET reading_value = ?, difference = ?, photo_url = COALESCE(?, photo_url) WHERE id = ?`,
                [newValue, difference, photo_url, readingId]
            );

            // 獲取所有後續讀數
            const [subsequentReadings] = await conn.query(
                `SELECT * FROM ${historyTableName} WHERE meter_id = ? AND reading_time > ? ORDER BY reading_time ASC`,
                [meterId, originalReading[0].reading_time]
            );

            // 更新後續讀數的差額
            let previousValue = newValue;
            for (const reading of subsequentReadings) {
                const newDifference = reading.reading_value - previousValue;
                await conn.query(
                    `UPDATE ${historyTableName} SET difference = ? WHERE id = ?`,
                    [newDifference, reading.id]
                );
                previousValue = reading.reading_value;
            }

            // 更新最新的電表讀數（如果修改的是最新讀數）
            if (subsequentReadings.length === 0) {
                await conn.query(
                    `UPDATE ${tableName} SET current_reading = ? WHERE meter_number = ?`,
                    [newValue, meterId]
                );
            }

            await conn.commit();
            res.status(200).json({ message: '讀數更新成功' });
        } catch (error) {
            await conn.rollback();
            console.error('Error updating meter reading history:', error);
            res.status(500).json({ message: '更新失敗', error: error.message });
        } finally {
            conn.release();
        }
    });
});

  app.get('/meter-history/:meterType/:meterId', async (req, res) => {
    try {
        const { meterType, meterId } = req.params;
        let tableName = meterType === 'digital' ? 'digital_meter_readings_history' : 'mechanical_meter_readings_history';
        
        const [history] = await pool.query(
            `SELECT id, meter_id, reading_value, reading_time, photo_url, difference, 
            ${meterType === 'digital' ? 'brand, display_unit' : 'ct_value, wiring_method'}
            FROM ${tableName} WHERE meter_id = ? ORDER BY reading_time DESC LIMIT 10`,
            [meterId]
        );
        res.json(history);
    } catch (error) {
        console.error('Error fetching meter history:', error);
        res.status(500).send(error.message);
    }
});

// 新增數位式電表
app.post('/digital-meters', authenticateToken, authorize(['data_manager', 'admin']), async (req, res) => {
    try {
        const { meter_number, location, campus_id, brand, display_unit } = req.body;
        await pool.query('INSERT INTO digital_meters (meter_number, location, campus_id, brand, display_unit) VALUES (?, ?, ?, ?, ?)', 
            [meter_number, location, campus_id, brand, display_unit]);
        res.status(201).send('Digital meter added successfully');
    } catch (error) {
        console.error('Error adding digital meter:', error);
        res.status(500).send(error.message);
    }
});

// 新增機械式電表
app.post('/mechanical-meters', authenticateToken, authorize(['data_manager', 'admin']), async (req, res) => {
    try {
        const { meter_number, location, campus_id, ct_value, wiring_method } = req.body;
        await pool.query('INSERT INTO mechanical_meters (meter_number, location, campus_id, ct_value, wiring_method) VALUES (?, ?, ?, ?, ?)', 
            [meter_number, location, campus_id, ct_value, wiring_method]);
        res.status(201).send('Mechanical meter added successfully');
    } catch (error) {
        console.error('Error adding mechanical meter:', error);
        res.status(500).send(error.message);
    }
});

// 更新數位式電表
app.put('/digital-meters/:id', authenticateToken, authorize(['data_manager', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { brand, display_unit } = req.body;
        console.log('Updating digital meter:', id, { brand, display_unit });
        const [result] = await pool.query('UPDATE digital_meters SET brand = ?, display_unit = ? WHERE id = ?', [brand, display_unit, id]);
        if (result.affectedRows === 0) {
            return res.status(404).send('Digital meter not found');
        }
        res.status(200).send('Digital meter updated successfully');
    } catch (error) {
        console.error('Error updating digital meter:', error);
        res.status(500).send(error.message);
    }
});

// 更新機械式電表
app.put('/mechanical-meters/:id', authenticateToken, authorize(['data_manager', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { ct_value, wiring_method } = req.body;
        console.log('Updating mechanical meter:', id, { ct_value, wiring_method });
        const [result] = await pool.query('UPDATE mechanical_meters SET ct_value = ?, wiring_method = ? WHERE id = ?', [ct_value, wiring_method, id]);
        if (result.affectedRows === 0) {
            return res.status(404).send('Mechanical meter not found');
        }
        res.status(200).send('Mechanical meter updated successfully');
    } catch (error) {
        console.error('Error updating mechanical meter:', error);
        res.status(500).send(error.message);
    }
});

// 新增校區
app.post('/campuses', authenticateToken, authorize(['data_manager']), async (req, res) => {
    try {
        const { name } = req.body;
        const [existingCampus] = await pool.query('SELECT * FROM campuses WHERE name = ?', [name]);
        if (existingCampus.length > 0) {
            return res.status(409).send('Campus already exists');
        }
        await pool.query('INSERT INTO campuses (name) VALUES (?)', [name]);
        res.status(201).send('Campus added successfully');
    } catch (error) {
        console.error('Error adding campus:', error);
        res.status(500).send(error.message);
    }
});

// 用戶管理 (只有 admin 可以)
app.post('/users', authenticateToken, authorize(['admin']), async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // 驗證輸入
        if (!username || !password || !role) {
            return res.status(400).json({ message: '用戶名、密碼和角色都是必填項' });
        }

        // 檢查用戶名是否已存在
        const [existingUser] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUser.length > 0) {
            return res.status(409).json({ message: '用戶名已存在' });
        }

        // 驗證角色
        const validRoles = ['admin', 'data_manager', 'reader'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: '無效的角色' });
        }

        // 加密密碼
        const hashedPassword = await bcrypt.hash(password, 10);

        // 插入新用戶
        await pool.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, role]
        );

        res.status(201).json({ message: '用戶創建成功' });
    } catch (error) {
        console.error('創建用戶時出錯:', error);
        res.status(500).json({ message: '服務器錯誤', error: error.message });
    }
});

// 獲取所有用戶列表 (只有 admin 可以)
app.get('/users', authenticateToken, authorize(['admin']), async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, username, role FROM users');
        res.json(users);
    } catch (error) {
        console.error('獲取用戶列表時出錯:', error);
        res.status(500).json({ message: '服務器錯誤', error: error.message });
    }
});

// 刪除用戶 (只有 admin 可以)
app.delete('/users/:id', authenticateToken, authorize(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '用戶不存在' });
        }
        res.json({ message: '用戶刪除成功' });
    } catch (error) {
        console.error('刪除用戶時出錯:', error);
        res.status(500).json({ message: '服務器錯誤', error: error.message });
    }
});

// 更新用戶信息 (只有 admin 可以)
app.put('/users/:id', authenticateToken, authorize(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { username, role, password } = req.body;

        // 檢查用戶是否存在
        const [existingUser] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        if (existingUser.length === 0) {
            return res.status(404).json({ message: '用戶不存在' });
        }

        // 準備更新數據
        const updates = {};
        if (username) updates.username = username;
        if (role) updates.role = role;
        if (password) {
            updates.password = await bcrypt.hash(password, 10);
        }

        // 如果沒有要更新的數據，返回錯誤
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: '沒有提供要更新的數據' });
        }

        // 執行更新
        await pool.query('UPDATE users SET ? WHERE id = ?', [updates, id]);

        res.json({ message: '用戶信息更新成功' });
    } catch (error) {
        console.error('更新用戶信息時出錯:', error);
        res.status(500).json({ message: '服務器錯誤', error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.get('/test-bcrypt', async (req, res) => {
    const password = '123456789';
    const hashedPassword = await bcrypt.hash(password, 10);
    const isMatch = await bcrypt.compare(password, hashedPassword);
    res.json({ hashedPassword, isMatch });
  });

