import { Request, Response } from "express";
import TryCatch from "./TryCatch.js";
import getBuffer from "./config/dataUri.js";
import  cloudinary from "cloudinary";
import { sql } from "./config/db.js";
import { redisClient } from "./index.js";


interface AuthenticatedRequest extends Request{
    user?:{
        _id: string,
        role: string
    }
}

export const addAlbum= TryCatch(async(req:AuthenticatedRequest, res:Response)=>{
    if(req.user?.role !== 'admin'){
        res.status(401).json({
            message: 'You are not admin',
        });
        return;
    }
    const {title, description}= req.body

    const file = req.file

    if(!file){
        res.status(400).json({
            message: 'No file to upload'
        })
        return;
    }
    const fileBuffer= getBuffer(file)

    if(!fileBuffer || !fileBuffer.content){
        res.status(500).json({
            message:'failed to generate buffer'
        })
        return;
    }

    const cloud= await cloudinary.v2.uploader.upload(fileBuffer.content,{
        folder: 'albums',
    })
    const result = await sql`
    INSERT INTO albums (title, description, thumbnail) 
    VALUES (${title}, ${description}, ${cloud.secure_url} ) RETURNING *
    `;
    if(redisClient.isReady){
        await redisClient.del("albums"); // Clear songs list
        console.log("Cache invalidated for albums");
    }

    res.json({
        message:'Album Created',
        album: result[0]
    })
})

export const addSong = TryCatch(async(req: AuthenticatedRequest, res)=>{
    if (req.user?.role !== "admin") {
         res.status(401).json({ message: "You are not admin" });
        return;
    }

    const { title, description, album } = req.body;

    // Ensure album ID is a valid number
    if (!album || isNaN(Number(album))) {
         res.status(400).json({ message: "Invalid album ID" });
        return;
    }

    // Check if album exists
    const isAlbum = await sql`SELECT * FROM albums WHERE id = ${album}`;
    if (isAlbum.length === 0) {
         res.status(404).json({ message: "No album found with this ID" });
         return;
    }

    // Ensure file exists
    const file = req.file;
    if (!file) {
        res.status(400).json({ message: "No file to upload" });
        return;
    }

    // Ensure file is an audio file
    if (!file.mimetype.startsWith("audio/")) {
         res.status(400).json({ message: "Invalid file type. Only audio files are allowed." });
         return;
    }

    // Convert file buffer to Base64
    const fileBuffer = getBuffer(file);
    if (!fileBuffer || !fileBuffer.content) {
        res.status(500).json({ message: "Failed to generate buffer" });
        return;
    }

    // Upload to Cloudinary
    try {
        const cloud = await cloudinary.v2.uploader.upload(fileBuffer.content, {
            folder: "songs",
            resource_type: "video", // Required for audio files
            format: "mp3", // Ensure a valid audio format
        });

        // Insert song into the database
        await sql`
            INSERT INTO songs(title, description, audio, album_id)
            VALUES (${title}, ${description}, ${cloud.secure_url}, ${album})
        `;
        if(redisClient.isReady){
            await redisClient.del("songs"); // Clear songs list
            console.log("Cache invalidated for song");
        }
    

        res.json({ message: "Song added successfully", audioUrl: cloud.secure_url });
    } catch (error) {
        console.error("Cloudinary Upload Error in addSong controller:", error);
        res.status(500).json({ message: "Failed to upload audio file" });
    }
})
export const addThumbnail = TryCatch(async (req: AuthenticatedRequest, res) => {
    if (req.user?.role !== "admin") {
        res.status(401).json({ message: "You are not admin" });
        return;
    }

    const song = await sql`SELECT * FROM songs WHERE id = ${req.params.id}`;
    if (song.length === 0) {
        res.status(404).json({ message: "No song found with this ID" });
        return;
    }

    const file = req.file;
    if (!file) {
        res.status(400).json({ message: "No file to upload" });
        return;
    }

    
    if (!file.mimetype.startsWith("image/")) {
        res.status(400).json({ message: "Invalid file type. Only image files are allowed." });
        return;
    }

    const fileBuffer = getBuffer(file);
    if (!fileBuffer || !fileBuffer.content) {
        res.status(500).json({ message: "Failed to generate buffer" });
        return;
    }

    try {
        // Upload thumbnail to Cloudinary (stored in "thumbnails" folder)
        const cloud = await cloudinary.v2.uploader.upload(fileBuffer.content, {
            folder: "thumbnails",
        });

        // Update song with the new thumbnail URL
        const result = await sql`
            UPDATE songs SET thumbnail = ${cloud.secure_url} WHERE id = ${req.params.id} RETURNING *
        `;

        if(redisClient.isReady){
            await redisClient.del("songs"); // Clear songs list
            console.log("Cache invalidated for songs");
        }
    
        res.json({
            message: "Song thumbnail added successfully",
            song: result[0],
        });
    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        res.status(500).json({ message: "Failed to upload thumbnail" });
    }
});

export const deleteAlbum= TryCatch(async(req:AuthenticatedRequest, res)=>{
    if (req.user?.role !== "admin") {
        res.status(401).json({ message: "You are not admin" });
        return;
    }
    const {id}= req.params

     // Check if album exists
     const isAlbum = await sql`SELECT * FROM albums WHERE id = ${id}`;
     if (isAlbum.length === 0) {
          res.status(404).json({ message: "No album found with this ID" });
          return;
     }

    await sql `DELETE FROM songs WHERE album_id= ${id} `;
    await sql `DELETE FROM albums WHERE id=${id}`;

    if(redisClient.isReady){
        await redisClient.del("songs"); // Clear songs list
        console.log("Cache invalidated for songs");
    }
    if(redisClient.isReady){
        await redisClient.del("albums"); // Clear songs list
        console.log("Cache invalidated for albums");
    }


    res.json({
        message: 'Album Deleted Successfully'
    })

})

export const  deleteSong=  TryCatch(async(req:AuthenticatedRequest, res)=>{
    if (req.user?.role !== "admin") {
        res.status(401).json({ message: "You are not admin" });
        return;
    }
    const {id}= req.params

     // Check if album exists
     const isSong = await sql`SELECT * FROM songs WHERE id = ${id}`;
     if (isSong.length === 0) {
          res.status(404).json({ message: "No Song found with this ID" });
          return;
     }
     if(redisClient.isReady){
        await redisClient.del("songs"); // Clear songs list
        console.log("Cache invalidated for songs ");
    }


    await sql `DELETE FROM songs WHERE id= ${id} `;
    

    res.json({
        message: 'Song Deleted Successfully'
    })

})