import { Pool, QueryResult } from 'pg';

export default class PostgresCRUD {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
    });
  }

  public async query(queryText: string, params?: any[]): Promise<QueryResult> {
    const client = await this.pool.connect();

    try {
      return await client.query(queryText, params);
    } finally {
      client.release();
    }
  }

  public async select(tableName: string, columns: string[] = ['*'], whereClause: string = '', params: any[] = []): Promise<any[]> {
    const queryText = `SELECT ${columns.join(',')} FROM ${tableName} ${whereClause ? 'WHERE ' + whereClause : ''}`;
    const result = await this.query(queryText, params);
    return result.rows;
  }

  public async insert(tableName: string, data: any): Promise<any> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(',');
    const queryText = `INSERT INTO ${tableName} (${keys.join(',')}) VALUES (${placeholders}) RETURNING *`;
    const result = await this.query(queryText, values);
    return result.rows[0];
  }

  public async update(tableName: string, data: any, whereClause: string = '', params: any[] = []): Promise<any> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, index) => `${key}=$${index + 1}`).join(',');
    const queryText = `UPDATE ${tableName} SET ${setClause} ${whereClause ? 'WHERE ' + whereClause : ''} RETURNING *`;
    const result = await this.query(queryText, [...values, ...params]);
    return result.rows[0];
  }

  public async delete(tableName: string, whereClause: string = '', params: any[] = []): Promise<any> {
    const queryText = `DELETE FROM ${tableName} ${whereClause ? 'WHERE ' + whereClause : ''} RETURNING *`;
    const result = await this.query(queryText, params);
    return result.rows[0];
  }
}
