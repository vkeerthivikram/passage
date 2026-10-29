import 'dotenv/config';import {buildServer} from './server.js';import {pool} from './db.js';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required; Passage will not start without durable storage');
const app=await buildServer();await pool.query('SELECT 1');await app.listen({host:'0.0.0.0',port:Number(process.env.PORT??3001)});for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await app.close();await pool.end();process.exit(0);});
