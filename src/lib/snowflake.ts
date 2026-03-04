import snowflake from 'snowflake-sdk'
import path from 'path'
import fs from 'fs'

// Enable logging for debugging
snowflake.configure({ logLevel: 'WARN' })

// Connection configuration from environment variables
const getConnectionConfig = (): snowflake.ConnectionOptions => {
  const config: snowflake.ConnectionOptions = {
    account: process.env.SNOWFLAKE_ACCOUNT!,
    username: process.env.SNOWFLAKE_USER!,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'TAKEHOME_WH',
    database: process.env.SNOWFLAKE_DATABASE || 'TAKEHOME_DB',
    schema: process.env.SNOWFLAKE_SCHEMA || 'ANALYTICS',
  }
  
  // Check for private key auth
  if (process.env.SNOWFLAKE_PRIVATE_KEY_PATH) {
    // Resolve path relative to project root
    const keyPath = path.resolve(process.cwd(), process.env.SNOWFLAKE_PRIVATE_KEY_PATH)
    console.log('Loading private key from:', keyPath)
    config.privateKey = fs.readFileSync(keyPath, 'utf-8')
    config.authenticator = 'SNOWFLAKE_JWT'
  } else if (process.env.SNOWFLAKE_PASSWORD) {
    // Password auth
    config.password = process.env.SNOWFLAKE_PASSWORD
  } else {
    // External browser auth - works for local development
    config.authenticator = 'EXTERNALBROWSER'
  }
  
  return config
}

// Connection pool
let connection: snowflake.Connection | null = null
let connectionPromise: Promise<snowflake.Connection> | null = null

export async function getConnection(): Promise<snowflake.Connection> {
  // Return existing connection if available
  if (connection) {
    return connection
  }
  
  // If connection is being established, wait for it
  if (connectionPromise) {
    return connectionPromise
  }

  const config = getConnectionConfig()
  const conn = snowflake.createConnection(config)
  
  console.log('Connecting to Snowflake...', { 
    account: config.account, 
    user: config.username,
    authenticator: config.authenticator || 'password'
  })

  // Use connectAsync for external browser auth
  if (config.authenticator === 'EXTERNALBROWSER') {
    connectionPromise = conn.connectAsync((_err, _conn) => {})
      .then(() => {
        console.log('Connected to Snowflake successfully')
        connection = conn
        return conn
      })
      .catch((err: Error) => {
        console.error('Failed to connect to Snowflake:', err.message)
        connectionPromise = null
        throw err
      })
  } else {
    // Use callback-based connect for other auth methods
    connectionPromise = new Promise((resolve, reject) => {
      conn.connect((err, conn) => {
        if (err) {
          console.error('Failed to connect to Snowflake:', err.message)
          connectionPromise = null
          reject(err)
        } else {
          console.log('Connected to Snowflake successfully')
          connection = conn
          resolve(conn)
        }
      })
    })
  }
  
  return connectionPromise
}

export interface QueryResult<T> {
  rows: T[]
}

export async function executeQuery<T>(sql: string, binds?: (string | number)[]): Promise<T[]> {
  const conn = await getConnection()
  
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText: sql,
      binds: binds,
      complete: (err, stmt, rows) => {
        if (err) {
          console.error('Query error:', err.message)
          reject(err)
        } else {
          resolve((rows || []) as T[])
        }
      }
    })
  })
}

// Helper to format numbers for display
export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`
  }
  return `$${value.toFixed(2)}`
}

export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toLocaleString()
}
