import { neon } from '@neondatabase/serverless'; // Import Neon client
import dotenv from 'dotenv';
dotenv.config();


export const sql= neon(process.env.DB_URL as string)