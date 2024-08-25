import express, { Request, Response } from "express"
const app = express();

import * as path from 'path'

import dotenv from 'dotenv'
dotenv.config();

import { Exist, RealmEyeWrapper, RealmEyeWrapperExaltations } from "../realm/wrapper";

app.get('/', async (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'entry.html'));
})

app.get('/:player', async (req: Request, res: Response) => {
    const player = req.params.player;
    if (!await Exist(player)) {
        res.json({ "error": "player not exist", "param": player, "code": 400 })
    }
    const data = await RealmEyeWrapper.Get(player);
    res.json({ "player": data.player_stats });
})

app.get('/:player/characters', async (req: Request, res: Response) => {
    const player = req.params.player;
    if (!await Exist(player)) {
        res.json({ "error": "player not exist", "param": player, "code": 400 })
    }
    const data = await RealmEyeWrapper.Get(player);
    res.json({ "characters": data.characters });
})

app.get('/:player/all', async (req: Request, res: Response) => {
    const player = req.params.player;
    if (!await Exist(player)) {
        res.json({ "error": "player not exist", "param": player, "code": 400 })
    }
    const data = await RealmEyeWrapper.Get(player);
    res.json({ "player": data.player_stats, "characters": data.characters });
})

// Move to a router
app.get('/exalt/:player', async (req: Request, res: Response) => {
    const { player } = req.params;
    if (!await Exist(player)) {
        res.json({ "error": "player not exist", "param": player, "code": 400 })
    }
    const exalt = await RealmEyeWrapperExaltations.Get(player);
    res.json({ "exalt": exalt.json_ })
}) 

app.all('*', (req: Request, res: Response) => {
    res.sendStatus(404);
})


if (process.env.PROD == "false")
    app.listen(8000, () => console.log("Server ready on port 3000 ~ 8000"));

export default app;