const snowflake = require('snowflake-sdk')
const path = require('path')
const fs = require('fs')

const keyPath = path.resolve(__dirname, '../.keys/rsa_key.p8')
const privateKey = fs.readFileSync(keyPath, 'utf-8')

const conn = snowflake.createConnection({
  account: 'kd98950.us-east-2.aws',
  username: 'JORDANMILLHAUSEN',
  privateKey,
  authenticator: 'SNOWFLAKE_JWT',
  warehouse: 'TAKEHOME_WH',
  database: 'TAKEHOME_DB',
  schema: 'RAW',
})

function query(sql) {
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText: sql,
      complete: (err, stmt, rows) => {
        if (err) reject(err)
        else resolve(rows)
      },
    })
  })
}

async function main() {
  await new Promise((resolve, reject) => {
    conn.connect((err) => { if (err) reject(err); else resolve() })
  })
  console.log('Connected\n')

  // Create RECENT_POS_ORDERS with identical schema to POS_FLATTENED_DT
  console.log('Creating RAW.RECENT_POS_ORDERS (matching POS_FLATTENED_DT schema)...')
  await query(`
    CREATE OR REPLACE TABLE RAW.RECENT_POS_ORDERS (
      ORDER_ID NUMBER(38,0),
      TRUCK_ID NUMBER(38,0),
      ORDER_TS TIMESTAMP_NTZ,
      ORDER_TS_DATE DATE,
      ORDER_YEAR NUMBER(4,0),
      ORDER_MONTH NUMBER(2,0),
      ORDER_DETAIL_ID NUMBER(38,0),
      LINE_NUMBER NUMBER(38,0),
      TRUCK_BRAND_NAME TEXT,
      MENU_TYPE TEXT,
      PRIMARY_CITY TEXT,
      REGION TEXT,
      COUNTRY TEXT,
      FRANCHISE_FLAG NUMBER(38,0),
      FRANCHISE_ID NUMBER(38,0),
      FRANCHISEE_NAME TEXT,
      LOCATION_ID NUMBER(38,0),
      MENU_ITEM_ID NUMBER(38,0),
      MENU_ITEM_NAME TEXT,
      QUANTITY NUMBER(5,0),
      UNIT_PRICE NUMBER(38,4),
      PRICE NUMBER(38,4),
      ORDER_AMOUNT NUMBER(38,4),
      ORDER_TAX_AMOUNT NUMBER(38,4),
      ORDER_DISCOUNT_AMOUNT NUMBER(38,4),
      ORDER_TOTAL NUMBER(38,4)
    )
  `)
  console.log('Done!\n')

  // Verify by comparing columns
  console.log('Verifying column match with POS_FLATTENED_DT...')
  const dtCols = await query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'HARMONIZED' AND TABLE_NAME = 'POS_FLATTENED_DT'
    ORDER BY ORDINAL_POSITION
  `)
  const newCols = await query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'RAW' AND TABLE_NAME = 'RECENT_POS_ORDERS'
    ORDER BY ORDINAL_POSITION
  `)

  const dtNames = dtCols.map(r => r.COLUMN_NAME)
  const newNames = newCols.map(r => r.COLUMN_NAME)
  console.log('DT columns:', dtNames.join(', '))
  console.log('New table:  ', newNames.join(', '))
  console.log('Match:', JSON.stringify(dtNames) === JSON.stringify(newNames) ? 'YES' : 'NO')

  conn.destroy()
}

main().catch((err) => {
  console.error('Failed:', err.message)
  conn.destroy()
  process.exit(1)
})
