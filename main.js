process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { BrowserWindow, app, ipcMain, dialog, Menu } = require("electron");
const { webContents } = require("electron");
const path = require("path");
const fs = require("fs");
const { setTimeout } = require("timers/promises");
const https = require('node:https');
const api_server = require('./modules/api_riot');

const jsonFilePath = './information.json';

//const fetch = require('node-fetch');
//import {get_winrate_player_champions  , get_last_champion_played} from "./public/assets/js/to_api_server";
//const function_player = require("./public/assets/js/to_api_server");

//roba backend
const { data } = require("jquery");
const LCUConnector = require("lcu-connector");
const WebSocket = require('ws');

const MESSAGE_TYPES = {
    WELCOME: 0,
    PREFIX: 1,
    CALL: 2,
    CALLRESULT: 3,
    CALLERROR: 4,
    SUBSCRIBE: 5,
    UNSUBSCRIBE: 6,
    PUBLISH: 7,
    EVENT: 8
};

var lolData = null;
let player_name = null;
let api_key = "RGAPI-f771141e-7364-4965-b5e4-0f9565ab3a94";

let mainWindow;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        minWidth: 900,
        minHeight: 700,
        titleBarStyle: "hiddenInset",
        transparent: true,
        frame:false,
        webPreferences : {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(app.getAppPath(), "renderer.js")
        }
    })
    mainWindow.setBackgroundColor("rgba(10, 20, 40, 0.8)");
    mainWindow.webContents.openDevTools();
    mainWindow.loadFile("./public/index.html");

    ipcMain.on('closeApp', ()=>{
        console.log("CLOSE");
        mainWindow.close();
    })

    ipcMain.on('minimizeApp', ()=>{
        console.log("MIN");
        mainWindow.minimize();
    })

    ipcMain.on('maximizeApp', ()=>{
        console.log("MAX");
        if(mainWindow.isMaximized()){
            mainWindow.unmaximize();
        }else
            mainWindow.maximize();
    })
}

app.whenReady().then(createWindow);

console.log("SONO IL MAIN");

/*
setTimeout(5000, ()=>{
    let options = {
        hostname: '127.0.0.1',
        port: port,
        path:'/lol-service-status/v1/lcu-status',
        method: 'GET',
        rejectUnauthorized: false
    }

    let req = https.request(options, (res)=>{
        console.log('All OK. Server matched our pinned cert or public key');
        console.log('statusCode:', res.statusCode);
        // Print the HPKP values
        console.log('headers:', res.headers['public-key-pins']);
        res.on("data", (d)=>{console.log("\n DATI FETCH \n"+d+"\nDATI FETCH")});
    })

    req.on('error', (e) => {
        console.error("ERROR"+e.message);
      });
    
    req.end();
})
*/

function calculate_team_elo(players_tier, players_rank){
    console.log("player_tiers", players_tier, "players_rank", players_rank);
    console.log("player_tiers[1]", players_tier[1], "players_rank[1]", players_rank[1]);

    let result = 0;
    for(let i = 0; i < 5; i++){
        switch(players_tier[i]){
            case "IRON":
                result += 1;
                break;
            case "BRONZE":
                result += 5;
                break;
            case "SILVER":
                result += 9;
                break;
            case "GOLD":
                result += 13;
                break;
            case "PLATINUM":
                result += 17;
                break;
            case "DIAMOND":
                result += 21;
                break;
            case "MASTER":
                result += 25;
                break;
            case "GRANDMASTER":
                result += 27;
                break;
            case "CHALLENGER":
                result += 29;
                break;
        }
    }
    console.log("result pre rank", result);
    for(let i = 0; i < 5; i++){
        switch(players_rank[i]){
            case "II":
                result += 1;
                break;
            case "III":
                result += 2;
                break;
            case "IV":
                result += 3;
                break;
        }
    }
    console.log("result finale", result);

    result = result / 5;
    return result;
}

class RiotWSProtocol extends WebSocket {

    constructor(url) {
        super(url, 'wamp');

        this.session = null;
        this.on('message', this._onMessage.bind(this));
    }

    close() {
        super.close();
        this.session = null;
    }

    terminate() {
        super.terminate();
        this.session = null;
    }

    subscribe(topic, callback) {
        super.addListener(topic, callback);
        this.send(MESSAGE_TYPES.SUBSCRIBE, topic);
    }

    unsubscribe(topic, callback) {
        super.removeListener(topic, callback);
        this.send(MESSAGE_TYPES.UNSUBSCRIBE, topic);
    }

    send(type, message) {
        super.send(JSON.stringify([type, message]));
        //console.log("prova console.log", JSON.stringify([type, message]));
    }

    _onMessage(message) {
        const [type, ...data] = JSON.parse(message);
        //lolData = data.payload;

        //console.log("DATI PRESI DA NOI" + lolData + "altri dati\n");

        switch (type) {
            case MESSAGE_TYPES.WELCOME:
                this.session = data[0];
                // this.protocolVersion = data[1];
                // this.details = data[2];
                break;
            case MESSAGE_TYPES.CALLRESULT:
                console.log('Unknown call, if you see this file an issue at https://discord.gg/hPtrMcx with the following data:', data);
                break;
            case MESSAGE_TYPES.TYPE_ID_CALLERROR:
                console.log('Unknown call error, if you see this file an issue at https://discord.gg/hPtrMcx with the following data:', data);
                break;
            case MESSAGE_TYPES.EVENT:
                const [topic, payload] = data;
                lolData = payload;
                //console.log("il playload" + JSON.stringify(payload) +"zono payload");

                //console.log(lolData);
                try{
                    if(lolData.data.gameName != undefined && player_name == null && lolData.uri == '/lol-chat/v1/me'){
                        player_name = lolData.data.gameName;
                        let player_level = lolData.data.lol.level;
                        let player_ranked_tier = lolData.data.lol.rankedLeagueTier;
                        let player_ranked_level = lolData.data.lol.rankedLeagueDivision;
                        //console.log(player_ranked_level);
                        let icon_id = lolData.data.icon;

                        //console.log("PLAYER NAME: " + player_name);
                        //fa transitare l'app dalla schermata di loading
                        //alla vera e propria app
                        mainWindow.webContents.send("info-player-get", {player_name , player_level, player_ranked_tier,player_ranked_level, icon_id});
                        //svuotare file json

                        //api_server.get_last_champion_played("AlexNext");
                        api_server.get_winrate_player_champions("AlexNext", 20);
                        
                        //api_server.get_winrate_player_champions("AlexNext", 75, "Olaf");
                        
                    } 
                } catch(error){
                    //console.log(error);
                }

                //aggiungere codice e dati sugli avversari così da avere un dataset completo + rivedere scrittura file / gestire cancellazione etc

                try{
                    let summonerId;
                    let enemies_tier = new Array(); //gold, plat etc
                    let enemies_rank = new Array(); //I, II, III, IV
                    let allies_tier = new Array();
                    let allies_rank = new Array();
                    let average_elo_enemies;
                    let average_elo_allies;
                    let difference_between_teams;
                    //visti i dati che vengono forniti dall'app l'idea è sempre quella di utilizzare le api per ottenere il match da cui poi si prendono i partecipanti
                    //serve il summonerId che è salvato dalla API come Id
                    //la funzione ultima da chiamare per calcolare elo etc è 
                    //https://euw1.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/Z2FkqeYQXUklIqRdkbrKdyV1nSuAxP68x9tqpVsrCDURtpo
                    //dove l'ultimo è il summonerId di un tizio random
                    //da questa funzione si prendono tutti i summonerId o i nickname e si chiama
                    //https://euw1.api.riotgames.com/lol/league/v4/ entries/by-summoner/Z2FkqeYQXUklIqRdkbrKdyV1nSuAxP68x9tqpVsrCDURtpo
                    //che ritorna le informazioni richieste in modo semplice
                    /*
                    if(lolData.data.phase == "GameStart"){
                        fetch("https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/" + lolData.data.gameName +"?api_key=" + api_key)
                        .then(result => result.json())
                        .then(data => {

                            summonerId = data.id;
                            summonerId = "FW4mwI3UhFBKruDOOyBVCbbAO_KjHg-HI-sSH27Iq9XckdU";
                            fetch("https://euw1.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/"+ summonerId +"?api_key=" + api_key)
                            .then(result => result.json())
                            .then(data => {
                                let call_num = 0;
                                //console.log("dati seconda fetch",data);

                                let participants_array = new Array();
                                let teamId_array = new Array();
                                let teamId_player;

                                for(let i = 0; i < 10; i++){
                                    participants_array.push(data.participants[i].summonerId);
                                    teamId_array.push(data.participants[i].teamId);

                                    if(participants_array[i] == summonerId){
                                        teamId_player = data.participants[i].teamId;
                                    }

                                    //console.log("data.participants[i].summonerId", data.participants[i].summonerId);
                                    //console.log("data.participants[i].teamId", data.participants[i].teamId);
                                }
                                for(let i = 0; i < 10; i++){
                                    fetch("https://euw1.api.riotgames.com/lol/league/v4/entries/by-summoner/" + participants_array[i] + "?api_key=" + api_key)
                                    .then(result => result.json())
                                    .then(data =>{
                                        //console.log("partecipanti", participants_array);
                                        //console.log("data terza fetch", data);
                                        //console.log("data[k].queueType", data[0].queueType);
                                        if(teamId_array[i] == teamId_player){
                                            //console.log("dati dei player alleati", data);
                                            for(let k = 0; k < 3; k++){
                                                if(data[k].queueType == "RANKED_SOLO_5x5"){
                                                    allies_tier.push(data[k].tier);
                                                    allies_rank.push(data[k].rank);
                                                    //console.log("data[k].tier", data[k].tier, "data[k].rank", data[k].rank);
                                                    break;
                                                }
                                            }
                                        }
                                        else{
                                            console.log("dati dei player nemici", data);
                                            for(let k = 0; k < 3; k++){
                                                if(data[k].queueType == "RANKED_SOLO_5x5"){
                                                    enemies_tier.push(data[k].tier);
                                                    enemies_rank.push(data[k].rank);
                                                    break;
                                                }
                                            }
                                            //console.log("enemies tier e enemis rank", enemies_tier, enemies_rank);   
                                        }
                                    })
                                    .then(() =>{
                                        call_num++;
                                        if(call_num == 10){
                                            //console.log("allies tier e allies rank", allies_tier, allies_rank);
                                            //console.log("enemies tier e enemis rank", enemies_tier, enemies_rank);   
    
                                            average_elo_allies = calculate_team_elo(allies_tier, allies_rank);
                                            average_elo_enemies = calculate_team_elo(enemies_tier, enemies_rank);
                                            difference_between_teams = average_elo_allies - average_elo_enemies; //quindi valori negativi non sono buoni
                                            console.log("average_elo_allies average_elo_enemies difference_between_teams riga 331", average_elo_allies, average_elo_enemies, difference_between_teams);

                                            let obj_difference_between_teams = {"difference_between_teams": difference_between_teams};

                                            let string_obj = JSON.stringify(obj_difference_between_teams);
                                            let obj_array = new Array();
                                            

                                            fs.readFile('information.json', 'utf8', (err, datas)=>{
                                                if (err){
                                                    console.log("errore lettura", err);
                                                } else {
                                                    console.log("datas letti dal file", datas);
                                                    let obj = JSON.parse(datas); //now it an object
                                                    Array.from(obj).forEach(e =>  obj_array.push(e));
                                                   
                                                    obj_array.push(obj_difference_between_teams);
                                                    
                                                    let json_array = JSON.stringify(obj_array,  undefined, 1); //convert it back to json
                                                    fs.writeFile('information.json', json_array, 'utf8', function (err) {
                                                        if (err) {
                                                            console.log("An error occured while writing JSON Object to File.");
                                                            return console.log(err);
                                                        }
                                                        console.log("FILEPATH: "+ jsonFilePath, "obj" + string_obj);
                                                        console.log("JSON file has been saved.");
                                                    });
                                                }
                                            });
                                        }
                                    })
                                    .catch((error) =>{
                                        console.log("errore nella terza fetch", error);
                                    })
                                }
                            })
                            .catch((error) =>{
                                console.log("errore nella seconda fetch", error);
                            })
                        })
                        .catch(() =>{
                            console.log("errore nella prima fetch", error);
                        })
                    }
                    */
                }
                catch(error){
                    //console.log("ha fatto errore lo studio del game", error);
                }
                
                this.emit(topic, payload);
                break;
            default:
                console.log('Unknown type, if you see this file an issue with at https://discord.gg/hPtrMcx with the following data:', [type, data]);
                break;
        }
    }
}

/** HOW TO USE */
var port;
var pass;

const connector = new LCUConnector();
connector.on('connect', data => {

    console.log('League Client has started', data);

    port = data.port;
    pass = data.pass;

    const ws = new RiotWSProtocol('wss://riot:'+data.password+'@localhost:'+data.port+'/');
    ws.on('open', () => {
        ws.subscribe('OnJsonApiEvent', console.log);
    });
});

connector.on('disconnect', () => {
    console.log('League Client has been closed');
});


connector.start();
console.log('Listening for League Client');

