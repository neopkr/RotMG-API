import express, { Request, Response } from "express"
const app = express();

import * as path from 'path'

import dotenv from 'dotenv'
dotenv.config();

import { RealmEyeWrapper } from "../realm/data";

app.get('/', async (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'entry.html'));
})

app.get('/:player', async (req: Request, res: Response) => {
    const player = req.params.player;
    if (!await RealmEyeWrapper.Exist(player)) {
        res.json({ "error": "player not exist", "param": player, "code": 400 })
    }
    const data = await RealmEyeWrapper.Get(player);
    res.json({ "player": data.player_stats });
})

app.get('/:player/characters', async (req: Request, res: Response) => {
    const player = req.params.player;
    if (!await RealmEyeWrapper.Exist(player)) {
        res.json({ "error": "player not exist", "param": player, "code": 400 })
    }
    const data = await RealmEyeWrapper.Get(player);
    res.json({ "characters": data.characters });
})

app.get('/:player/all', async (req: Request, res: Response) => {
    const player = req.params.player;
    if (!await RealmEyeWrapper.Exist(player)) {
        res.json({ "error": "player not exist", "param": player, "code": 400 })
    }
    const data = await RealmEyeWrapper.Get(player);
    res.json({ "player": data.player_stats, "characters": data.characters });
})

app.all('*', (req: Request, res: Response) => {
    res.sendStatus(404);
})


if (process.env.PROD == "false")
    app.listen(5000, () => console.log("Server ready on port 3000 ~ 5000"));

export default app;