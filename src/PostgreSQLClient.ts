import { Pool, PoolClient, QueryResult } from 'pg';

class PostgreSQLClient {
    private pool: Pool;

    constructor() {
        const config = {
            user: "postgres",
            host: 'localhost',
            database: "atechat",
            password: "studio",
            port: 5432,
        
            // 扩展属性
            max: 20, // 连接池最大连接数
            idleTimeoutMillis: 3000, // 连接最大空闲时间 3s
        }

        this.pool = new Pool(config);

    }

    public async query(queryText: string, params?: any[]): Promise<QueryResult> {
        const client = await this.pool.connect();

        try {
            return await client.query(queryText, params);
        } finally {
            client.release();
        }
    }

    public async insert(tableName: string, data: any): Promise<any> {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = values.map((_, index) => `$${index + 1}`).join(',');
        const queryText = `INSERT INTO ${tableName} (${keys.join(',')}) VALUES (${placeholders}) RETURNING *`;
        const result = await this.query(queryText, values);
        return result.rows;
    }

    public async update(table: string, whereClause: any, setClause: any) : Promise<QueryResult> {

        const fields = Object.keys(setClause);
        const values = Object.values(setClause);
        const updateSet = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    
        const fieldPrimary = Object.keys(whereClause);
        const valuePrimary = Object.values(whereClause);
        const updateWhere = fieldPrimary.map((pk, i) => `${pk} = $${i + 1 + fields.length}`).join(' AND ');
    
        const sql = `UPDATE ${table} SET ${updateSet} WHERE ${updateWhere} RETURNING *`;
        const result = await this.query(sql, [...values, ...valuePrimary]);
        return result;
    }
    
    public async delete(table: string, conditions: any) : Promise<QueryResult> {
        const fields = Object.keys(conditions);
        const values = Object.values(conditions);
        const placeholders = fields.map((field, i) => `${field} = $${i + 1}`).join(' AND ');
        
        const sql = `DELETE FROM ${table} WHERE ${placeholders} RETURNING *`;
        const result = await this.query(sql, values);
        return result;
    }

    public async find(table: string, conditions: any) : Promise<QueryResult> {
        const fields = Object.keys(conditions);
        const values = Object.values(conditions);
        const placeholders = fields.map((field, i) => `${field} = $${i + 1}`).join(' AND ');
        const sql = `SELECT * FROM ${table} WHERE ${placeholders}`;
        const result = await this.query(sql, values);
        return result;
    }

    public async transaction<T = any>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();

        try {
            await client.query("BEGIN");

            const result = await callback(client);

            await client.query("COMMIT");

            return result;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    public async close() {
        await this.pool.end();
    }
}

export default PostgreSQLClient;
