import {Pool, type PoolClient} from 'pg';
export const pool=new Pool({connectionString:process.env.DATABASE_URL,max:12,connectionTimeoutMillis:5000});
export async function withUser<T>(userId:string,fn:(db:PoolClient)=>Promise<T>):Promise<T>{const db=await pool.connect();try{await db.query('BEGIN');await db.query("SELECT set_config('app.user_id',$1,true)",[userId]);const value=await fn(db);await db.query('COMMIT');return value;}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}}
export function present(row:any){return {...row.data,id:row.id,revision:row.revision,createdAt:new Date(row.created_at).toISOString(),updatedAt:new Date(row.updated_at).toISOString()};}
export async function change(db:PoolClient,user:string,entity:string,id:string,data:unknown,deleted=false){await db.query('INSERT INTO changes(user_id,entity,id,deleted,data) VALUES($1,$2,$3,$4,$5)',[user,entity,id,deleted,data]);}
