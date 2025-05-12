import { NextFunction, Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import multer from "multer";

dotenv.config();

interface IUser {
    _id: string,
    name: string,
    email: string,
    password: string,
    role: string,
    playlist: string[];
}

interface AuthenticatedRequest extends Request {
    user?: IUser | null;
}

// Multer setup
const storage = multer.memoryStorage();

 const uploadFile = multer({ storage }).single("file") ;
 export default uploadFile

//authentication of admin services

export const isAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = req.headers.token as string;

        if (!token) {
            res.status(403).json({
                message: "please login",
            });
            return;
        }

        const { data } = await axios.get(`${process.env.User_URL}/api/v1/user/me`, {
            headers: {
                token,
            }
        });

        req.user = data;

        next();
    } catch (error) {
        res.status(403).json({
            message: 'please login'
        });
    }
}
