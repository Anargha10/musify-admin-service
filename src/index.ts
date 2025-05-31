import express from "express";
import dotenv from "dotenv";
import { sql } from "./config/db.js";
import adminRoutes from './route.js'
import cloudinary from "cloudinary";
import redis from 'redis'
import cors from 'cors'

dotenv.config();


export const redisClient= redis.createClient({
    password:process.env.Redis_Password ,
    socket:{
        host:"redis-11461.crce182.ap-south-1-1.ec2.redns.redis-cloud.com",
        port: 11461,
    }
})

redisClient.connect().then(()=> console.log("connected to redis"))
.catch(console.error)

cloudinary.v2.config({
    cloud_name:process.env.Cloud_Name ,
    api_key: process.env.Cloud_Api_Key ,
    api_secret: process.env.Cloud_Api_Secret 
})

const app = express();
app.use(cors({
    origin: 'https://www.imanargha.shop', // Or specify '' if needed
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials:true
}));


const PORT = process.env.PORT ;

app.use(express.json());
 // Use the authentication middleware for all routes
 async function initDB() {
    try {
        await sql`
        CREATE TABLE IF NOT EXISTS albums(
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description VARCHAR(255) NOT NULL,
        thumbnail VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        `;
        await sql`
        CREATE TABLE IF NOT EXISTS songs(
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description VARCHAR(255) NOT NULL,
        thumbnail VARCHAR(255),
        audio VARCHAR(255) NOT NULL,
        album_id INTEGER REFERENCES albums(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        `;
        
        console.log("Database Initialized Successfully")

    } catch (error) {
        console.log("Error initDB", error);
    }
 }

app.get("/", (req, res) => {
    res.send("Welcome to the Admin Service!");
});

app.use('/api/v1', adminRoutes);

// Add more routes as needed
initDB().then(()=>{
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
})

