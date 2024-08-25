/**
 * Get the data from RealmEye by webscraping.
 * If the "stat" are hidden in RealmEye throw undefined.
 * @neopkr 24/08
 */

import axios from "axios"
import * as cheerio from "cheerio";

export interface PlayerStats {
    /** Player name */
    name: string | undefined

    /** Number of characters alive */
    characters: number | undefined,
    
    /** Total of skins */
    skins: number | undefined,
    
    /** Total of exaltations  */
    exaltations: number | undefined,
    
    /** Total fame alive with of the characters */
    fame: number | undefined,
    
    /** Number rank */
    rank: number | undefined,
    
    /** Undefined */
    account_fame: number | undefined,
    
    /** Guild name */
    guild: string | undefined,
    
    /** Guild rank */
    guild_rank: string | undefined,
    
    /** First time player seen */
    first_seen: string | undefined,
    
    /** Last time player seen */
    last_seen: string | undefined
}

/**
 * PlayerCharacter Interface
 * @description Map for Characters
 * @ignore pet_name can not be added, the span.pet in the attr title has the pet name, but this name is added by javascript so cheerio can't grab it.
 */
export interface PlayerCharacter {
    /** Pet data id */
    pet_id: number | undefined;

    /** Skin Unique Indentifier */
    skin_id: number | undefined;

    /** Character class name */
    char_class: string | undefined;

    /** Character Level */
    level: number | undefined;

    /** Character Fame */
    fame: number | undefined;

    /** Character Placement */
    pl: number | undefined;

    /** Character Equipment */
    equipment: string[] | undefined;

    /** Character Stats */
    stats: string | undefined;

    /** Character Stats */
    stats_expanded: CharacterStat | undefined;

    /** Character Last Seen */
    last_seen: string | undefined;

    /** Character Last Seen Server */
    last_server: string | undefined
}

/**
 * CharacterStat
 * @description Stat Value with bonuses
 * @example
 * hp = string with the bonus // example: hp: "750(+10)"
 * hp_bonus = number of the current bonus // example 10
 */
export interface CharacterStat {
    hp: string | undefined;
    hp_bonus: number | undefined;
    mp: string | undefined;
    mp_bonus: number | undefined;
    att: string | undefined;
    att_bonus: number | undefined;
    def: string | undefined;
    def_bonus: number | undefined;
    spd: string | undefined;
    spd_bonus: number | undefined;
    vit: string | undefined;
    vit_bonus: number | undefined;
    wis: string | undefined;
    wis_bonus: number | undefined;
    dex: string | undefined;
    dex_bonus: number | undefined;
}

// Make Request Headers global
const req_headers = {
    'User-Agent': 'Mozilla/5.0'
}

/**
 * Wrapper for Player Stats and Characters
 */
export class RealmEyeWrapper {
    player_name: string;
    player_stats: PlayerStats = {
        name: undefined,
        characters: undefined,
        skins: undefined,
        exaltations: undefined,
        fame: undefined,
        rank: undefined,
        account_fame: undefined,
        guild: undefined,
        guild_rank: undefined,
        first_seen: undefined,
        last_seen: undefined
    };
    characters: PlayerCharacter[] = [];

    private constructor(ign: string) {
        this.player_name = ign;
    }

    static async Get(ign: string): Promise<RealmEyeWrapper> {
        const instance = new RealmEyeWrapper(ign);
        await instance.getPlayerInfo();
        return instance;
    }

    private async getPlayerInfo(): Promise<void> {
        const req = await axios.get(`https://www.realmeye.com/player/${this.player_name}`, { headers: req_headers });
        if (req.status == 200) {
            const $ = cheerio.load(req.data);
            this.player_stats.characters = this.extractNumericValue($, 'Characters');
            this.player_stats.skins = this.extractNumericValue($, 'Skins');
            this.player_stats.exaltations = this.extractNumericValue($, 'Exaltations');
            this.player_stats.fame = this.extractNumericValue($, 'Fame');
            this.player_stats.rank = this.extractRank($, 'Rank');
            this.player_stats.account_fame = this.extractNumericValue($, 'Account fame');
            this.player_stats.guild = this.extractTextValue($, 'Guild');
            this.player_stats.guild_rank = this.extractTextValue($, 'Guild Rank');
            this.player_stats.first_seen = this.extractTextValue($, 'First seen');
            this.player_stats.last_seen = this.extractLastSeen($);

            this.Modifiers();
            this.getCharacterInfo($);
        }
    }

    private getCharacterInfo($: cheerio.CheerioAPI): void {
        if (this.player_stats.characters == 0)
            return;
        
        const table = $('table.table.table-striped.tablesorter');
        table.find('tbody').each((_, tbody) => {
            $(tbody).find('tr').each((_, element) => {
                const charInfo: PlayerCharacter = {
                    pet_id: undefined,
                    skin_id: undefined,
                    char_class: undefined,
                    level: undefined,
                    fame: undefined,
                    pl: undefined,
                    equipment: undefined,
                    stats: undefined,
                    stats_expanded: undefined,
                    last_seen: undefined,
                    last_server: undefined
                };

                charInfo.skin_id = parseInt($(element).find('a.character').attr('data-skin') || '0', 10);
                if ($(element).find('td').eq(1).text() == "") {
                    charInfo.pet_id = parseInt($(element).find('span.pet').attr('data-item') || '0', 10);
                    charInfo.char_class = $(element).find('td').eq(2).text();
                    charInfo.level = parseInt($(element).find('td').eq(3).text() || '0', 10);
                    charInfo.fame = parseInt($(element).find('td').eq(4).text() || '0', 10);
                    charInfo.pl = parseInt($(element).find('td').eq(5).text() || '0', 10);
                } else {
                    charInfo.char_class = $(element).find('td').eq(1).text();
                    charInfo.level = parseInt($(element).find('td').eq(2).text() || '0', 10);
                    charInfo.fame = parseInt($(element).find('td').eq(3).text() || '0', 10);
                    charInfo.pl = parseInt($(element).find('td').eq(4).text() || '0', 10);
                }
                
                charInfo.equipment = [];
                $(element).find('span.item-wrapper a span.item').each((_, equipElement) => {
                    charInfo.equipment!.push($(equipElement).attr('title') || '');
                });

                let stat = $(element).find('span.player-stats');
                
                let dataStatString = stat.attr('data-stats') || '[]';
                let dataBonusString = stat.attr('data-bonuses') || '[]';

                let dataStat: number[] = JSON.parse(dataStatString);
                let dataBonus: number[] = JSON.parse(dataBonusString);

                const charStat: CharacterStat = {
                    hp: dataStat[0] !== undefined ? `${dataStat[0]}(+${dataBonus[0]})` : undefined,
                    hp_bonus: dataBonus[0] !== undefined ? dataBonus[0] : undefined,
                    mp: dataStat[1] !== undefined ? `${dataStat[1]}(+${dataBonus[1]})` : undefined,
                    mp_bonus: dataBonus[1] !== undefined ? dataBonus[1] : undefined,
                    att: dataStat[2] !== undefined ? `${dataStat[2]}(+${dataBonus[2]})` : undefined,
                    att_bonus: dataBonus[2] !== undefined ? dataBonus[2] : undefined,
                    def: dataStat[3] !== undefined ? `${dataStat[3]}(+${dataBonus[3]})` : undefined,
                    def_bonus: dataBonus[3] !== undefined ? dataBonus[3] : undefined,
                    spd: dataStat[4] !== undefined ? `${dataStat[4]}(+${dataBonus[4]})` : undefined,
                    spd_bonus: dataBonus[4] !== undefined ? dataBonus[4] : undefined,
                    vit: dataStat[5] !== undefined ? `${dataStat[5]}(+${dataBonus[5]})` : undefined,
                    vit_bonus: dataBonus[5] !== undefined ? dataBonus[5] : undefined,
                    wis: dataStat[6] !== undefined ? `${dataStat[6]}(+${dataBonus[6]})` : undefined,
                    wis_bonus: dataBonus[6] !== undefined ? dataBonus[6] : undefined,
                    dex: dataStat[7] !== undefined ? `${dataStat[7]}(+${dataBonus[7]})` : undefined,
                    dex_bonus: dataBonus[7] !== undefined ? dataBonus[7] : undefined
                };

                charInfo.stats = stat.text();
                charInfo.stats_expanded = charStat;

                charInfo.last_seen = $(element).find('span.timeago').attr('title') || '';
                if (charInfo.last_seen != "")
                    charInfo.last_server = $(element).find('td').last().text() || '';
                else {
                    charInfo.last_server = "";
                }

                this.characters.push(charInfo);
            });
        });
    }

    /**
     * Modifiers
     * @description Get current player_stats and fix some text or numbers.
     */
    private Modifiers() : void {
        this.player_stats.name = this.player_name;
        if (this.player_stats.guild != undefined) {
            if (this.player_stats.guild.includes(this.player_stats.guild_rank!)) {
                this.player_stats.guild = this.player_stats.guild.replace(this.player_stats.guild_rank!, "");
            }
        }
    }

    private extractNumericValue($: cheerio.CheerioAPI, label: string): number | undefined {
        const cell = $(`td:contains("${label}")`).next();
        let value;
        if (cell.text().includes("(")) {
            value = cell.text().split(" ")[0]; // Split the space and leave the current value
            value = Number(value) // Convert text to number
        } else {
            value = parseInt(cell.text().replace(/[^0-9]/g, ''));
        }
        return isNaN(value) ? undefined : value;
    }

    private extractTextValue($: cheerio.CheerioAPI, label: string): string | undefined {
        const cell = $(`td:contains("${label}")`).next();
        return cell.text().trim() || undefined;
    }

    private extractRank($: cheerio.CheerioAPI, label: string): number | undefined {
        const starContainer = $(`td:contains("${label}")`).next().find('.star-container');
        const rank = parseInt(starContainer.text().replace(/[^0-9]/g, ''));
        return isNaN(rank) ? undefined : rank;
    }

    private extractLastSeen($: cheerio.CheerioAPI): string | undefined {
        const cell = $(`td:contains("Last seen")`).next();
        const timeago = cell.find('.timeago').attr('title');
        return timeago || undefined;
    }
}

/**
 * Wrapper for Skins of player
 */
export class RealmEyeWrapperSkins {}

/**
 * Character Exaltations
 */
interface CharacterExaltations {
    /** Skins unique identifier */
    skin_id: number | undefined;
    
    /** Class name  */
    class_: string | undefined;

    /** Total of exalts with the class */
    exalts: number | undefined;

    /** Exalt HP */
    hp: string | undefined;

    /** Exalt MP */
    mp: string | undefined;

    /** Exalt Attack */
    att: string | undefined;

    /** Exalt Defense */
    def: string | undefined;

    /** Exalt Speed */
    spd: string | undefined;

    /** Exalt Dextery */
    dex: string | undefined;

    /** Exalt Vitality */
    vit: string | undefined;

    /** Exalt Wisdom */
    wis: string | undefined;
}

/**
 * Wrapper for Exaltations of player
 */
export class RealmEyeWrapperExaltations {
    player_name: string;
    characters: CharacterExaltations[] = [];
    json_: any = {
        player: "",
        exaltations: "",
        percent: "",
        exalts: this.characters
    }

    constructor(ign: string) {
        this.player_name = ign;
    }

    static async Get(ign: string): Promise<RealmEyeWrapperExaltations> {
        const instance = new RealmEyeWrapperExaltations(ign);
        await instance.getCharacters();
        return instance;
    }

    private async getCharacters(): Promise<void> {
        const req = await axios.get(`https://www.realmeye.com/exaltations-of/${this.player_name}`, { headers: req_headers });
        if (req.status == 200) {
            const $ = cheerio.load(req.data);

            this.json_.player = this.player_name;
            if ($("h3").text() != "Exaltations are hidden") {
                this.json_.exaltations = $("h3").text().split("~")[0].trim().split(":")[1].trim(); // should be only the exalts that player have and another variable for the maximum exalts?
                this.json_.percent = $("h3").text().split("~")[1];
            } else {
                this.json_ = {
                    player: this.player_name,
                    error: "This player has exaltations hidden"
                };

                return;
            }

            const table = $('table.table.table-striped.tablesorter');
            table.find('tbody').each((_, tbody) => {
                $(tbody).find('tr').each((_, element) => {
                    const charExalt: CharacterExaltations = {
                        skin_id: undefined,
                        class_: undefined,
                        exalts: undefined,
                        hp: undefined,
                        mp: undefined,
                        att: undefined,
                        def: undefined,
                        spd: undefined,
                        dex: undefined,
                        vit: undefined,
                        wis: undefined
                    }
                    charExalt.skin_id = parseInt($(element).find('a.character').attr('data-skin') || '0', 10);
                    charExalt.class_ = $(element).find('td').eq(1).text();
                    charExalt.exalts = parseInt($(element).find('td').eq(2).text());
                    charExalt.hp = $(element).find('td').eq(3).text() || '0';
                    charExalt.mp = $(element).find('td').eq(4).text() || '0';
                    charExalt.att = $(element).find('td').eq(5).text() || '0';
                    charExalt.def = $(element).find('td').eq(6).text() || '0';
                    charExalt.spd = $(element).find('td').eq(7).text() || '0';
                    charExalt.dex = $(element).find('td').eq(8).text() || '0';
                    charExalt.vit = $(element).find('td').eq(9).text() || '0';
                    charExalt.wis = $(element).find('td').eq(10).text() || '0';

                    this.characters.push(charExalt);
                });
            });
        }
    }
}

/**
 * Wrapper for Offers that the players has
 */
export class RealmEyeWrapperOffers {
    player_name: string;
    constructor(ign: string) {
        this.player_name = ign;
    }

    static async Get(ign: string): Promise<RealmEyeWrapperOffers> {
        const instance = new RealmEyeWrapperOffers(ign);
        await instance.getOffers();
        return instance;
    }

    private async getOffers() {
        
    }
}

/**
 * Wrapper for Pets of player
 * @ignore this class can use pet_id to identifier the "main" pet.
 */
export class RealmEyeWrapperPets {}

/**
 * Wrapper the player graveyard
 * Limit: 10
 */
export class RealmEyeWrapperGraveyard {}

// Utils
export async function Exist(ign: string): Promise<boolean> {
    const req_headers = {
        'User-Agent': 'Mozilla/5.0'
    }

    const req = await axios.get(`https://www.realmeye.com/player/${ign}`, { headers: req_headers });
    const $ = cheerio.load(req.data);
    if ($('.player-not-found').length > 0) {
        return false;
    }
    
    return true;
}