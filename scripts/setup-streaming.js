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
  console.log('Connected to Snowflake\n')

  console.log('1. Creating ORDER_ID_SEQ...')
  await query('CREATE OR REPLACE SEQUENCE RAW.ORDER_ID_SEQ START = 1000000000 INCREMENT = 1')
  console.log('   Done')

  console.log('2. Creating ORDER_DETAIL_ID_SEQ...')
  await query('CREATE OR REPLACE SEQUENCE RAW.ORDER_DETAIL_ID_SEQ START = 1000000000 INCREMENT = 1')
  console.log('   Done')

  console.log('3. Setting DT target lag to 1 minute (minimum allowed)...')
  await query("ALTER DYNAMIC TABLE HARMONIZED.POS_FLATTENED_DT SET TARGET_LAG = '1 minute'")
  console.log('   Done (note: DT minimum is 60s, not 5s)')

  // Verify sequences
  console.log('\n4. Verifying sequences...')
  const [seqTest] = await query('SELECT RAW.ORDER_ID_SEQ.NEXTVAL AS TEST_ID')
  console.log(`   ORDER_ID_SEQ next: ${seqTest.TEST_ID}`)

  const [seqTest2] = await query('SELECT RAW.ORDER_DETAIL_ID_SEQ.NEXTVAL AS TEST_ID')
  console.log(`   ORDER_DETAIL_ID_SEQ next: ${seqTest2.TEST_ID}`)

  console.log('\nAll setup complete!')
  console.log('DT refreshes every ~1 minute. Globe polls every 5s so new orders appear within ~65s of submission.')
  conn.destroy()
}

main().catch((err) => {
  console.error('Setup failed:', err.message)
  conn.destroy()
  process.exit(1)
})
