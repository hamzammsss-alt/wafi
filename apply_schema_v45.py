import sqlite3
import sys
import os

db_path = 'wafi.db'
sql_path = os.path.join('database', 'schema_v45_treasury_updates.sql')

try:
    with open(sql_path, 'r', encoding='utf-8') as f:
        sql = f.read()

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    # It might throw if duplicate columns exist
    for statement in sql.split(';'):
        if statement.strip():
            try:
                cursor.execute(statement)
            except sqlite3.OperationalError as e:
                if 'duplicate column name' in str(e):
                    pass
                else:
                    print(f"Error executing statement: {statement}\n{e}")
    conn.commit()
    conn.close()
    print("Schema applied successfully.")
except Exception as e:
    print(f"Failed to apply schema: {e}")
