const fs = require('fs');
const { resolve } = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

let key_api = "RGAPI-d2705e36-feed-4cb7-91c9-666a4b317f85";

const jsonFilePath = '../information.json';

let summoner_id_player;
let puuid_player;
let winrate_player;
let games_winned = 0;
let last_champion_played;

function sleep(miliseconds) {
    var currentTime = new Date().getTime();
    console.log("current time", currentTime);

    //console.log(currentTime);
    while (currentTime + miliseconds >= new Date().getTime()) {
        //console.log("aspetta");
    }
    console.log("while finito a ", new Date().getTime());
 }

function get_info_summoner_name(summoner_name){
    let url_req = "https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/" + summoner_name + "?api_key=";
    return fetch(url_req + key_api, {
    method: "GET",
    headers:{
        //'Access-Control-Allow-Origin': "Accept",
        'Access-Control-Request-Method': "GET",
        //'Access-Control-Allow-Headers': "Accept"
    }
    })
}

function get_list_matches(puuid, num_games){
    let url_games_req = "https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/" + puuid + "/ids?start=0&count=" + num_games + "&api_key=";
    puuid_player = puuid;
    return fetch(url_games_req + key_api, {
        method: "GET",
        headers:{
            'Access-Control-Request-Method': "GET",
        }
    })
}

function analize_matches(data, num_games){
    let last_games_played = JSON.stringify(JSON.stringify(data));
    let first_half_url = "https://europe.api.riotgames.com/lol/match/v5/matches/";
    let second_half_url = "?api_key=" + key_api;

    let name_game = last_games_played.split(',');
    
    for(let i = 0; i < num_games; i++){
        //console.log(name_game[i]);
        if(i == 0){
            name_game[i] = name_game[i].substr(4, 15);
        }
        else if(i == num_games-1){
            name_game[i] = name_game[i].substr(2, 15);
        }
        else{
            name_game[i] = name_game[i].substr(2, 15);
        }
        //console.log(name_game[i]);
    }

    let sum_games = 0;

    for(let j = 0; j < num_games; j++){

        let complete_url = first_half_url + name_game[j] + second_half_url;
        fetch(complete_url, { //gestire errore 429
            method: "GET",
            headers:{
                'Access-Control-Request-Method': "GET",
            }
        })
        .then(response => response.json())
        .then(data => {
            //console.log("eseguendo fetch n" + j);
            sum_games++;
            for(let y = 0; y < 10; y++){
                //console.log("ciclo n " + y + " di richiesta fetch numero " + j);
                //console.log(data.info.participants[y]);
                if(data.info.participants[y].puuid == puuid_player){ 
                    if(data.info.participants[y].win == true){
                        games_winned++;
                        //console.log(games_winned);
                    }
                    break;
                }
            }  
        })
        .then(() => {
            if(sum_games == num_games){
                winrate_player = (games_winned/num_games)*100;
                console.log("winrate player " + winrate_player);
                console.log("num_games " + num_games);
                console.log("games_winned " + games_winned);
            }
        })
        .catch(() =>{
            num_error++;
            if((num_error+sum_games) == num_games){ //così da fare il calcolo solo una volta
                winrate_player = (games_winned/sum_games)*100;
                console.log("winrate player " + winrate_player);
                console.log("num_games " + sum_games);
                console.log("games_winned " + games_winned);

                console.log("Fetch error: " + num_error);
            }
        })
        if((j % 15) == 0){
            sleep(2000); //2000 va bene e non dà troppi rallentamenti se non si tocca la funzione sleep
        }

        //console.log("finito ciclo " + j);
    }
}

let champions_player = new Array();

class champion{
    winrate;
    games_played;
    games_winned;
    champion_name;
    constructor(champion_name){
        this.champion_name = champion_name;
        this.winrate = 0;
        this.games_played = 0;
        this.games_winned = 0;
    }
    increase_games_played(){
        this.games_played++;
    }
    increase_games_winned(){
        this.games_winned++;
    }
    calculate_winrate(){
        this.winrate = (this.games_winned/this.games_played)*100;
    }
    check_champion_presence(name){
        if(this.champion_name == name)
            return true;
        else
            return false;
    }
    get_info(){ //
        /*
        let return_string = {"champion_stats": {"champion": this.champion_name, "winrate": this.winrate, "games_played": this.games_played, "games_winned": this.games_winned}};
        console.log("Champion: " + this.champion_name);
        console.log("Winrate with " + this.champion_name + ": " + this.winrate);
        console.log("Games played with" + this.champion_name + ": " + this.games_played);
        console.log("Games winned with" + this.champion_name + ": " + this.games_winned);
        */
       let return_string = {"champion_name": this.champion_name, "winrate": this.winrate, "games_played": this.games_played, "games_winned": this.games_winned};

        return return_string; //fare return di this.champion_name e winrate così come richiesto nella UI
    }
}

function analize_matches_champions_to_json(data, num_games){ //funzione che serve per scrivere poi in dati SOLO nella UI
    return new Promise((resolve, reject)=>{
        let last_games_played = JSON.stringify(JSON.stringify(data));
        let first_half_url = "https://europe.api.riotgames.com/lol/match/v5/matches/";
        let second_half_url = "?api_key=" + key_api;
    
        let name_game = last_games_played.split(',');
        
        for(let i = 0; i < num_games; i++){
            //console.log(name_game[i]);
            if(i == 0){
                name_game[i] = name_game[i].substr(4, 15);
            }
            else if(i == num_games-1){
                name_game[i] = name_game[i].substr(2, 15);
            }
            else{
                name_game[i] = name_game[i].substr(2, 15);
            }
            //console.log(name_game[i]);
        }
    
        let sum_games = 0;
        let num_error = 0;
    
        for(let j = 0; j < num_games; j++){
            let complete_url = first_half_url + name_game[j] + second_half_url;
            console.log("name game", name_game[j]);
            fetch(complete_url, {
                method: "GET",
                headers:{
                    'Access-Control-Request-Method': "GET",
                }
            })
            .then(response => response.json())
            .then(data => {
                //console.log("eseguendo fetch n" + j);
                //console.log("partita a buon fine n", j, data);
                sum_games++;
    
                for(let y = 0; y < 10; y++){
                    //console.log("ciclo n " + y + " di richiesta fetch numero " + j);
                    //console.log(data.info.participants[y]);
                    if(data.info.participants[y].puuid == puuid_player){
                        teamid_player = data.info.participants[y].teamId;
                        if(data.info.participants[y].win == true){
                            games_winned++;
                        }
                        let presence = false;
                        //console.log(data.info.participants[y].championName);
                        for(let z = 0; z < champions_player.length; z++){
                            if(champions_player[z].check_champion_presence(data.info.participants[y].championName) == true){
                                presence = true;
                                champions_player[z].increase_games_played();
                                if(data.info.participants[y].win == true){
                                    champions_player[z].increase_games_winned();
                                }
                                break;
                            }
                        }
                        
                        if(presence == false){
                            let add_champ = new champion(data.info.participants[y].championName);
                            if(data.info.participants[y].win == true){
                                add_champ.increase_games_winned();
                            }
                            add_champ.increase_games_played();
                            champions_player.push(add_champ);
                        }
    
                        break;
                    }
                }  
            })
            .then(() => {
                let winrate_champions_array = new Array();
    
                if(sum_games == num_games){ //così da fare il calcolo solo una volta
                    winrate_player = (games_winned/num_games)*100;
                    for(let i = 0; i < champions_player.length; i++){
                        champions_player[i].calculate_winrate();
                        winrate_champions_array[i] = champions_player[i].get_info(); //cambiare la get_info() perché scrive dati json, magari ritorna solo winrate
                    }
    
                    console.log("winrate player " + winrate_player);
                    console.log("num_games " + num_games);
                    console.log("games_winned " + games_winned);
    
                    //lo scopo di questa funzione è SOLO quello d mettere i dati nella UI
                    let obj_winrate;
                    obj_winrate = {"winrate_infos":{ "winrate_player": winrate_player, "num_games": num_games, "games_winned":games_winned}}
    
                    let string_obj = JSON.stringify(obj_winrate);
                    let obj_array = new Array();
                    
    
                    fs.readFile('information.json', 'utf8', (err, data)=>{ //togliere scrittura nel file e mettere cosa della promise
                        if (err){
                            console.log(err);
                        } else {
                            let obj = JSON.parse(data); //now it an object
                            Array.from(obj).forEach(e => obj_array.push(e));
    
                            obj_array.push(obj_winrate);
    
                            Array.from(winrate_champions_array).forEach(e => obj_array.push(e));
    
                            //obj_array.push(winrate_champions_array);
                            let json_array = JSON.stringify(obj_array,  undefined, 3); //convert it back to json
                            fs.writeFile('information.json', json_array, 'utf8', function (err) {
                                if (err) {
                                    console.log("An error occured while writing JSON Object to File.");
                                    return console.log(err);
                                }
                                console.log("FILEPATH: "+ jsonFilePath, "obj" + string_obj);
                                console.log("scrittura in then.");
                            });
                        }
                    });
    
                    
                }
            })
            .catch(() =>{
                num_error++;
                console.log("num errori", num_error);
                let winrate_champions_array = new Array();
                
                if((num_error+sum_games) == num_games){ //così da fare il calcolo solo una volta
                    winrate_player = (games_winned/sum_games)*100;
                    for(let i = 0; i < champions_player.length; i++){
                        champions_player[i].calculate_winrate();
                        champions_player[i].get_info();
                    }
    
                    //console.log("winrate player " + winrate_player);
                    //console.log("num_games " + sum_games);
                    //console.log("games_winned " + games_winned);
    
                    console.log("Fetch error: " + num_error);
    
                    let obj_winrate;
                    obj_winrate = {"winrate_infos":{ "winrate_player": winrate_player, "num_games": sum_games, "games_winned": games_winned}}
    
                    let string_obj = JSON.stringify(obj_winrate);
                    let obj_array = new Array();
                    
    
                    fs.readFile('information.json', 'utf8', (err, data)=>{ //togliere scrittura nel file e mettere cosa della promise
                        if (err){
                            console.log(err);
                        } else {
                            let obj = JSON.parse(data); //now it an object
                            Array.from(obj).forEach(e => obj_array.push(e));
    
                            obj_array.push(obj_winrate);
    
                            Array.from(winrate_champions_array).forEach(e => obj_array.push(e));
    
                            let json_array = JSON.stringify(obj_array,  undefined, 1); //convert it back to json
                            fs.writeFile('information.json', json_array, 'utf8', function (err) {
                                if (err) {
                                    console.log("An error occured while writing JSON Object to File.");
                                    return console.log(err);
                                }
                                console.log("FILEPATH: "+ jsonFilePath, "obj" + string_obj);
                                console.log("scrittura in catch");
                            });
                        }
                    });
                }
            })
            if((j % 15) == 0){
                sleep(2000); 
            }
        }
    })
    
}

function analize_matches_champions(data, num_games){ //funzione che serve per scrivere poi in dati SOLO nella UI
    return new Promise((resolve, reject)=>{
        let last_games_played = JSON.stringify(JSON.stringify(data));
        let first_half_url = "https://europe.api.riotgames.com/lol/match/v5/matches/";
        let second_half_url = "?api_key=" + key_api;
    
        let name_game = last_games_played.split(',');
        
        for(let i = 0; i < num_games; i++){
            //console.log(name_game[i]);
            if(i == 0){
                name_game[i] = name_game[i].substr(4, 15);
            }
            else if(i == num_games-1){
                name_game[i] = name_game[i].substr(2, 15);
            }
            else{
                name_game[i] = name_game[i].substr(2, 15);
            }
            //console.log(name_game[i]);
        }
    
        let sum_games = 0;
        let num_error = 0;
    
        for(let j = 0; j < num_games; j++){
            let complete_url = first_half_url + name_game[j] + second_half_url;
            console.log("name game", name_game[j]);
            fetch(complete_url, {
                method: "GET",
                headers:{
                    'Access-Control-Request-Method': "GET",
                }
            })
            .then(response => response.json())
            .then(data => {
                //console.log("eseguendo fetch n" + j);
                //console.log("partita a buon fine n", j, data);
                sum_games++;
    
                for(let y = 0; y < 10; y++){
                    //console.log("ciclo n " + y + " di richiesta fetch numero " + j);
                    //console.log(data.info.participants[y]);
                    if(data.info.participants[y].puuid == puuid_player){
                        teamid_player = data.info.participants[y].teamId;
                        if(data.info.participants[y].win == true){
                            games_winned++;
                        }
                        let presence = false;
                        //console.log(data.info.participants[y].championName);
                        for(let z = 0; z < champions_player.length; z++){
                            if(champions_player[z].check_champion_presence(data.info.participants[y].championName) == true){
                                presence = true;
                                champions_player[z].increase_games_played();
                                if(data.info.participants[y].win == true){
                                    champions_player[z].increase_games_winned();
                                }
                                break;
                            }
                        }
                        
                        if(presence == false){
                            let add_champ = new champion(data.info.participants[y].championName);
                            if(data.info.participants[y].win == true){
                                add_champ.increase_games_winned();
                            }
                            add_champ.increase_games_played();
                            champions_player.push(add_champ);
                        }
    
                        break;
                    }
                }  
            })
            .then(() => {
                let winrate_champions_array = new Array();
                console.log("THEN");
                console.log("sum games dentro then", sum_games);
                if(sum_games == num_games){ //così da fare il calcolo solo una volta
                    console.log("DENTRO IF di then")
                    winrate_player = (games_winned/num_games)*100;
                    for(let i = 0; i < champions_player.length; i++){
                        champions_player[i].calculate_winrate();
                        winrate_champions_array[i] = champions_player[i].get_info(); //cambiare la get_info() perché scrive dati json, magari ritorna solo winrate
                    }
    
                    console.log("winrate player " + winrate_player);
                    console.log("num_games " + num_games);
                    console.log("games_winned " + games_winned);
                    
                    let winrate_obj = {
                        'winrate_player': winrate_player,
                        'num_games': num_games,
                        'winrate_champions_array': winrate_champions_array
                    }
                    console.log(winrate_obj)
                    //{"champion_name": this.champion_name, "winrate": this.winrate, "games_played": this.games_played, "games_winned": this.games_winned};
                    
                    resolve(winrate_obj);

                }
            })
            .catch(() =>{
                num_error++;
                console.log("num errori", num_error);
                console.log("CATCH");
                console.log("sum_games dentro catch", sum_games);
                if((num_error+sum_games) == num_games){ //così da fare il calcolo solo una volta
                    console.log("DENTRO IF CATCH")
                    winrate_player = (games_winned/sum_games)*100;
                    for(let i = 0; i < champions_player.length; i++){
                        champions_player[i].calculate_winrate();
                        winrate_champions_array[i] = champions_player[i].get_info();
                    }

                    console.log("winrate player " + winrate_player);
                    console.log("num_games " + num_games);
                    console.log("games_winned " + games_winned);

                    let winrate_obj = {
                        'winrate_player': winrate_player,
                        'num_games': num_games,
                        'winrate_champions_array': winrate_champions_array
                    }
                    console.log(winrate_obj)
                    //{"champion_name": this.champion_name, "winrate": this.winrate, "games_played": this.games_played, "games_winned": this.games_winned};
                    
                    resolve(winrate_obj);
                }
            })
            if((j % 15) == 0){
                sleep(2000); 
            }
        }
    })
    
}

function get_champion_match(puuid){
    return new Promise((resolve, reject)=>{
        let url_games_req = "https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/" + puuid + "/ids?start=0&count=1&api_key=";
        puuid_player = puuid;
        fetch(url_games_req + key_api, {
            method: "GET",
            headers:{
                'Access-Control-Request-Method': "GET",
            }
        })
        .then(response => response.json())
        .then(data => {
            let last_game_played = JSON.stringify(JSON.stringify(data));
            let first_half_url = "https://europe.api.riotgames.com/lol/match/v5/matches/";
            let second_half_url = "?api_key=" + key_api;
            //console.log(last_game_played);
            let name_game = last_game_played.substr(4, 15);
            //console.log(name_game);

            let complete_url = first_half_url + name_game + second_half_url;
            fetch(complete_url, {
                method: "GET",
                headers:{
                    'Access-Control-Request-Method': "GET",
                }
            })
            .then(response => response.json())
            .then(data => {
                for(let i = 0; i < 10; i++){
                    if(data.info.participants[i].puuid == puuid_player){
                        last_champion_played = data.info.participants[i].championName;
                        break;
                    }
                }
                console.log("LAST CHAMP PROMISE " + last_champion_played);

                    if(last_champion_played == undefined){
                        console.log("REJECT PROMISE LAST CHAMP")
                        reject(Error(last_champion_played));
                    }
                    else{
                        console.log("RESOLVE PROMISE LAST CHAMP")
                        resolve(last_champion_played);
                    }    
            })
        })
        .catch(err => console.log(err));
    })
    
}

function to_json_champion_match(puuid){
    let url_games_req = "https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/" + puuid + "/ids?start=0&count=1&api_key=";
    puuid_player = puuid;
    fetch(url_games_req + key_api, {
        method: "GET",
        headers:{
            'Access-Control-Request-Method': "GET",
        }
    })
    .then(response => response.json())
    .then(data => {
        let last_game_played = JSON.stringify(JSON.stringify(data));
        let first_half_url = "https://europe.api.riotgames.com/lol/match/v5/matches/";
        let second_half_url = "?api_key=" + key_api;
        //console.log(last_game_played);
        let name_game = last_game_played.substr(4, 15);
        //console.log(name_game);

        let complete_url = first_half_url + name_game + second_half_url;
        fetch(complete_url, {
            method: "GET",
            headers:{
                'Access-Control-Request-Method': "GET",
            }
        })
        .then(response => response.json())
        .then(data => {
            for(let i = 0; i < 10; i++){
                if(data.info.participants[i].puuid == puuid_player){
                    last_champion_played = data.info.participants[i].championName;
                    break;
                }
            }
        })
        .then(() =>{
            let obj_champ = {"last_champion_played": {name: last_champion_played}};
            let string_obj = JSON.stringify(obj_champ);
            let obj_array = new Array();

            fs.readFile('information.json', 'utf8', (err, datas)=>{
                if (err){
                    console.log(err);
                } else {
                    let obj = JSON.parse(datas); //now it an object
                    Array.from(obj).forEach(e => obj_array.push(e));
                    
                    obj_array.push(obj_champ);
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
        })
    })
}

function get_winrate_player(summoner_name, num_games){
    get_info_summoner_name(summoner_name)
    .then(response => response.json())
    .then(data => {
        get_list_matches(data.puuid, num_games)
        .then(response => response.json())
        .then(data => {
            analize_matches(data, num_games);
        })
    })
}

function get_winrate_player_champions(summoner_name, num_games){
    return new Promise((resolve, reject)=>{
        get_info_summoner_name(summoner_name)
        .then(response => response.json())
        .then(data => {
            get_list_matches(data.puuid, num_games)
            .then(response => response.json())
            .then(data => {
                //restituisce valore
                return analize_matches_champions(data, num_games)
                .then((winrate)=>{
                    console.log("PROMISE LAST CHAMP 1")
                    if(winrate == null){
                        reject(Error(winrate));
                    }
                    else {
                        resolve(winrate);
                    }
                })
            })
        })
    })
}

function get_last_champion_played(summoner_name){
    get_info_summoner_name(summoner_name)
    .then(response => response.json())
    .then(data => {
        to_json_champion_match(data.puuid);
    })
}


function get_data_last_champion_played(summoner_name){
    return new Promise((resolve, reject)=>{
        get_info_summoner_name(summoner_name)
        .then(response => response.json())
        .then(data => {
            return get_champion_match(data.puuid)
            .then((last_champion_played)=>{
                console.log("PROMISE LAST CHAMP 1")
                if(last_champion_played == undefined){
                    console.log("REJECT PROMISE LAST CHAMP 2")
                    reject(Error(last_champion_played));
                }
                else {
                    console.log("RESOLVE PROMISE LAST CHAMP 2")
                    resolve(last_champion_played);
                }
            })
        })
    })
}



//module.exports.get_winrate_player = get_winrate_player;
module.exports.get_winrate_player_champions = get_winrate_player_champions;

module.exports.get_last_champion_played = get_last_champion_played;
module.exports.get_data_last_champion_played = get_data_last_champion_played;

