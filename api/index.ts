import express, { Request, Response } from "express"
const app = express();

import * as path from 'path'

import dotenv from 'dotenv'
dotenv.config();

import { RealmEyeWrapper } from "../realm/data";

app.get('/', async (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'entry.html'));
})

if (process.env.PROD == "false")
    app.listen(5000, () => console.log("Server ready on port 3000 ~ 5000"));

export default app;