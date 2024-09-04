const mysql = require('mysql2/promise');
const xlsx = require('xlsx');

const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: 'karta2274233',
    database: 'meter_management',
    port: 3306,  // 显式指定端口 3306預設
};
/*const dbConfig = {
    user: "ktzscd8h2faftqml",
    host: "k2fqe1if4c7uowsh.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    password: "vhamiiryq7w3k2mf",
    database: 'oizu7fzzttf1n05z',
};*/

const campusMapping = {
    '光復校區': 1,
    '成功校區': 2,
    '理學大樓': 3,
    '自強校區': 4,
    '勝利校區': 5,
    '力行校區': 6,
    '成杏、敬業校區': 7,
    '醫單宿舍': 8
};

async function importData() {
  const connection = await mysql.createConnection(dbConfig);

  try {
    await connection.beginTransaction();

    const workbook = xlsx.readFile('抄表表單.xlsx');
    const sheets = workbook.SheetNames;

    // 處理所有 16 個工作表
    for (let i = 0; i < 16; i++) {
      const sheet = workbook.Sheets[sheets[i]];
      const campusName = Object.keys(campusMapping)[i % 8]; // 使用模運算確保 campus_id 在 1-8 之間循環
      const tableName = i < 8 ? 'digital_meters' : 'mechanical_meters';
      await processSheet(connection, sheet, tableName, campusName);
    }

    await connection.commit();
    console.log('Data import completed successfully');
  } catch (error) {
    await connection.rollback();
    console.error('Error importing data:', error);
  } finally {
    await connection.end();
  }
}


async function processSheet(connection, sheet, tableName, campusName) {
  const data = xlsx.utils.sheet_to_json(sheet, { 
    range: 1, // 從第二行開始讀取，跳過標題行
    header: ['表號', '位置', '廠牌', '顯示單位Wh', '顯示單位VAh', '顯示單位VARh', 'CT', '電壓接線方式'],
    defval: null
  });

  const campusId = campusMapping[campusName];

  for (const row of data) {
    const meterNumber = row['表號'] ? row['表號'].toString().trim() : null;
    const location = row['位置'] ? row['位置'].toString().trim() : null;

    // 跳過標題行或無效數據
    if (!meterNumber || meterNumber === '表號' || location === '位置') {
      console.warn(`Skipping invalid row:`, row);
      continue;
    }

    let query, params;

    if (tableName === 'digital_meters') {
      const brand = row['廠牌'] && !isNaN(row['廠牌']) ? parseInt(row['廠牌'], 10) : null;
      const displayUnit = ['Wh', 'VAh', 'VARh'].filter(unit => row[`顯示單位${unit}`] === true).join(',') || null;

      query = `INSERT INTO digital_meters (meter_number, location, campus_id, brand, display_unit) 
               VALUES (?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE location = ?, campus_id = ?, brand = ?, display_unit = ?`;
      params = [meterNumber, location, campusId, brand, displayUnit, location, campusId, brand, displayUnit];
    } else {
      const ctValue = row['CT'] && !isNaN(row['CT']) ? parseInt(row['CT'], 10) : null;
      const wiringMethod = row['電壓接線方式'] ? row['電壓接線方式'].toString().trim() : null;

      query = `INSERT INTO mechanical_meters (meter_number, location, campus_id, ct_value, wiring_method) 
               VALUES (?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE location = ?, campus_id = ?, ct_value = ?, wiring_method = ?`;
      params = [meterNumber, location, campusId, ctValue, wiringMethod, location, campusId, ctValue, wiringMethod];
    }

    params = params.map(param => param === undefined ? null : param);

    try {
      await connection.execute(query, params);
      console.log(`Imported/Updated: ${meterNumber} (${campusName})`);
    } catch (err) {
      console.error(`Error importing row for meter number ${meterNumber}:`, err.message);
    }
  }
}
importData();