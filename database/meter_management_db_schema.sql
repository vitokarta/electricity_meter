-- 創建 campuses 表
CREATE TABLE campuses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 插入 campuses 数据
INSERT INTO campuses (name) VALUES
('光復校區'),
('成功校區'),
('理學大樓'),
('自強校區'),
('勝利校區'),
('力行校區'),
('成杏、敬業校區'),
('醫單宿舍');


-- 創建 digital_meters 表
CREATE TABLE digital_meters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meter_number VARCHAR(50) NOT NULL UNIQUE,
    location VARCHAR(100),
    campus_id INT,
    brand ENUM('1', '2') COMMENT '1: 施耐德, 2: 其他',
    display_unit SET('Wh', 'VAh', 'VARh'),
    last_reading INT,
    last_reading_time DATETIME,
    current_reading INT,
    current_reading_time DATETIME,
    difference INT,
    photo_url VARCHAR(255),
    FOREIGN KEY (campus_id) REFERENCES campuses(id)
);

-- 創建 mechanical_meters 表
CREATE TABLE mechanical_meters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meter_number VARCHAR(50) NOT NULL UNIQUE,
    location VARCHAR(100),
    campus_id INT,
    ct_value ENUM('1', '2') COMMENT '1: 有裝電比值, 2: 沒有',
    wiring_method VARCHAR(100),
    last_reading INT,
    last_reading_time DATETIME,
    current_reading INT,
    current_reading_time DATETIME,
    difference INT,
    photo_url VARCHAR(255),
    FOREIGN KEY (campus_id) REFERENCES campuses(id)
);

-- 創建 digital_meter_readings_history 表
CREATE TABLE digital_meter_readings_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meter_id VARCHAR(50),
    reading_value INT NOT NULL,
    reading_time DATETIME NOT NULL,
    photo_url VARCHAR(255),
    difference INT,
    brand ENUM('1', '2'),
    display_unit SET('Wh', 'VAh', 'VARh'),
    FOREIGN KEY (meter_id) REFERENCES digital_meters(meter_number)
);

-- 創建 mechanical_meter_readings_history 表
CREATE TABLE mechanical_meter_readings_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meter_id VARCHAR(50),
    reading_value INT NOT NULL,
    reading_time DATETIME NOT NULL,
    photo_url VARCHAR(255),
    difference INT,
    ct_value ENUM('1', '2'),
    wiring_method VARCHAR(100),
    FOREIGN KEY (meter_id) REFERENCES mechanical_meters(meter_number)
);

-- 創建 users 表
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'data_manager', 'reader') NOT NULL
);