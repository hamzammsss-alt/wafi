const { db } = require('./electron/database');
try {
    const info = db.prepare("PRAGMA table_info(hr_employees)").all();
    console.log(JSON.stringify(info, null, 2));
} catch (error) {
    console.error(error);
}
