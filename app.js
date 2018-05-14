// reminder: please check the dependencies in package.json 
// thanks!

//other variables
const settings 		= require("./settings.json");
const token 		= settings.token;					//token info goes in here

//discord stuff
const Discord 		= require("discord.js");
const client 		= new Discord.Client();

//mongo stuff
const mongoose 		= require("mongoose");
const MongoClient 	= require('mongodb').MongoClient;
const assert 		= require("assert");
const conn 			= settings.conn;
const database 		= settings.db;
const collection 	= settings.feats;

// to turn the bot on, do the following:
// 1. in CMD, go to the folder your code is in, e.g. c:\documents\pantheon-test in this case
// 2. in CMD, type the command "node app.js"
// 3. it should say "ready" when online. check the bot's status to confirm.
// 4. if you make changes, to restart the bot, enter "ctrl+c" and re-enter "node app.js".

client.on('ready',()=> {
	console.log("ready");
});

client.login(token);

//how we know something is a command
var prefix = "!";

client.on('message', message => {

	//this prevents the bot from replying to itself. juuuuust in case.
	if(message.author.bot) return;

	//messages without the prefix don't concern the bot
	if(!message.content.startsWith(prefix)) return;

	//figures out what the search term is
	let args = message.content.split(' ').slice(1);
	var argsresult = args.join(' ');

//===============================================================================================
//============== COMMANDS! ======================================================================
//===============================================================================================
	
	//!feat command - find feat info
	//shortcut for mobile is !f
	if(message.content.startsWith(prefix+'feat') || message.content.startsWith(prefix+'f')){
		var collection = settings.feats;
		//must have a search term
		if(!argsresult) {
			argsresult = null;
			console.log("invalid search term");
			message.reply("there's no search term :c");
		}
		else{
			var searchterm = argsresult;
			//this allows us to get the results in the callback.
			//we take the results, send it to a function that will create the message, and reply to the user.
			SearchFeats(searchterm, function(result){
				var msgText = CreateMessage(searchterm, result);
				message.reply(msgText);
			});
		}//end else
	}

	//another command, just for testing
	else if (message.content.startsWith(prefix + 'hi')) {
		message.reply('hello there!');
	}

	//!reqmatch or !r searches is a test for the prereq search
	//testing like this because I didn't have the server code initially
	//also i felt like this was easier just to see if we could even do it right (this was just as intial test)
	else if(message.content.startsWith(prefix + 'prereq') || message.content.startsWith(prefix + 'p')){
		if(!argsresult) {
			argsresult = null;
			console.log("invalid search term");
			message.reply("there's no search term :c");
		}
		else{
			var searchterm;
			var searchfeat;
			var splitStr = argsresult.split(", ");
			
			if(splitStr.length == 2){
				searchterm = ParseArgsResult(splitStr[1]);
				searchfeat = splitStr[0];
			}
			else
				searchterm = "error";

			

			if(searchterm != "error"){
				//this allows us to get the results in the callback.
				//we take the results, send it to a function that will create the message, and reply to the user.
				var query = `{ $text: { $search: ${searchfeat} } }`;
				SearchFeats(query, function(result){
					console.log(result);
					var msgText = "";

					if(result.length > 0) {
						console.log("has results in SearchFeats, now refining search by prereq");
						var convertedPrereq = ParsePrereqString(searchterm);

						console.log("converted prereq in message.content....");

						if(convertedPrereq.type != "not found"){
							console.log(`prereq given was converted: ${convertedPrereq.type} and ${convertedPrereq.limit}`);
							MatchRequirements(convertedPrereq, result, function(finalResultArray){
								msgText = CreatePrereqSearchMessage(finalResultArray, convertedPrereq);
							});
						}
						else {
							console.log("did not find prereq.");
							msgText = convertedPrereq.message;
						}
						console.log(msgText);
					
					}//end if
					else{
						console.log("no reqs found");
						msgText = "Nothing matches those prereqs unfortunately.";
					}
					message.reply(msgText);
				}); // end SearchFeats
			}
			else{
				var error = "We didn't understand what you meant. Did you format your answer correctly?\nYour answer should look like this: '!reqmatch dashing, CHA B+'";
				message.reply(error);
			}
		}//end else
	}

	//!help command - displays all commands you can use.
	else if(message.content.startsWith(prefix+'help')) {
		//making this unicode text helps with formatting. i just want tables.

		//also formatting sucks but here's a guide if you need it to make changes later
		//https://gist.github.com/ringmatthew/9f7bbfd102003963f9be7dbcf7d40e51
		var helpMessage = "\`\`\`ini\n----Here is a list of commands you can use:----\n\n";

		helpMessage += "[ !feat or !f ]  search for feats\nformat: '!feat extremely dash'\n\n";
		helpMessage += "[ !prereq or !p ]  provide 1 prereq and search for feats\nformat: '!prereq dashing, CHA B+'\n\n";
		helpMessage += "[ !hi ]  hi to you too! c:\nformat: '!hi'\n\n";
		helpMessage += "`\`\`\`";

		message.channel.send(helpMessage);
	}

	//============================================================================================
	// any other commands? just add to an else if
	//============================================================================================

	else{
		message.reply("Sorry, we didn't recognize that command.\n Try !help for more commands c:");
	}
});


//======================================================================================================
//search for a searchterm within feats and return result
//here's where the magic happens wowwwww
//======================================================================================================
function SearchFeats (searchterm, callback){
	MongoClient.connect(conn, function(err, client) {
		//error free first, bb
		if(err){
			console.log("error connecting to db_lorr");
			client.close();
			message.reply("We couldn't connect you..");
			throw err;
		}
		else { console.log("connection successful");

			//ok now search everything else.
			const db = client.db(database);
			const coll = db.collection(collection);
			var finalresult = "";
			var m;
			
			assert.equal(null, err);
			console.log("Connected successfully to server");

			//Nate, implement a text index for non-exact searching. 
			//if you don't, use what I have below to replace the {$text...} part
			//{name : searchterm}
			coll.find({ $text: { $search: searchterm } }).toArray(function(err, result){
				if(err){
					console.log(err);
				}
				else if(result.length > 0) {
					callback(result);
					console.log(result);
					console.log("found result, sent to callback");
					client.close();
				}
			});

			console.log("lorr_db closed.");
		}

	});
}

//======================================================================================================
//
//methods for !reqmatch or !r
//
//======================================================================================================

//prereq here is a json object
function MatchRequirements(prereq, result, callback){
	var finalResult = [];
	var indexMeetsSearch = true;

	//iterate through db results
	for(var i = 0; i < result.length; i++){
		//just a note, this assumes that every entry has an array, even a blank one, for stat_req

		if(result[i].prereq != null && result[i].prereq.stat_req[0] != null){
			console.log("Prereq exists");
			var stat_req = result[i].prereq.stat_req;
			indexMeetsSearch = true;
			var j = 0;

			console.log(`searching req: ${result[i].name}`);

			while(indexMeetsSearch && j < stat_req.length) {
				var stat_type = stat_req[j].stat_type.toUpperCase();
				var stat_limit = Enumerate(stat_req[j].stat_limit);
				var isMin = stat_req[j].is_limit_min;

				//only compare STR to STR, not STR to CHA
				if(prereq.type == stat_type){
					//check if the limit applies
					var meetsThisReq = (isMin) ? (stat_limit <= (Enumerate(prereq.limit))) : (stat_limit >= (Enumerate(prereq.limit)));
					if(!meetsThisReq)
						indexMeetsSearch = false;
					else
						j++;
				}
				else
					j++
			}// end while

			if(indexMeetsSearch){
				console.log(`  >  ${result[i].name} pushed to final`);
				finalResult.push(result[i]);
			}
			else
				console.log(`  >  ${result[i].name} did not qualify.`);
		}//end if(result[i].stat_req exists)


	}//end for
	
	callback(finalResult);
	console.log("sorted result from prereq given.");

}

//check in proper format: CHA B+
function ParseArgsResult(argsresult){
	var parsedArgs = 	argsresult.split(" ");
	var validTypes = 	["STR","CON","AGI","INT","CHA","PER"];
	var validLimits = 	["S","A+","A","B+","B","C+","C","D+","D","F+","F","F-"];

	//any other indexes past 0 and 1 are ignored, so as long as it's >=2
	if(parsedArgs.length >= 2){
		var isValidType = false;
		var isValidLimit = false;

		var parsedType = parsedArgs[0].toUpperCase();
		var parsedLimit = parsedArgs[1].toUpperCase();

		for(var t = 0; t < validTypes.length; t++){
			if(validTypes[t] == parsedType)
				isValidType = true;
		}
		for(var l = 0; l < validTypes.length; l++){
			if(validLimits[l] == parsedLimit)
				isValidLimit = true;
		}

		if(isValidLimit && isValidType){
			var parsedStr = `{"type": "${parsedType}", "limit":"${parsedLimit}"}`;
			return parsedStr;
		}
		else
			return "error";
	}
	else{
		return "error";
	}
}

function CreatePrereqSearchMessage(finalResult, prereq){
	var message = `We weren't able to find any skills that can be used with a ${prereq.limit} in ${prereq.type}:\n`;

	if(finalResult.length > 0){
		message = `Here are skills that can be used with a ${prereq.limit} in ${prereq.type}:\n`;
		for(var i = 0; i < finalResult.length; i++){
			message += `  > ${finalResult[i].name}\n`;
		}
	}

	return message;

}

function ParsePrereqString(prereqString){
	var notParsed = JSON.parse('{"type":"not found", "message":"Sorry, we didn\'t understand that prereq..."}');

	var isValidJson = function (){
	    try {
	        JSON.parse(prereqString);
	    } catch (e) {
	        return false;
	    }
	    return true;
	}

	if(isValidJson) {		
		console.log("successfully parsed into JSON - has prereqstring");
		return JSON.parse(prereqString);
	}
	else{
		console.log("not parsed");
		return notParsed;
	}
}

//i know, this is not enumeration
//i was just being lazy i'm sorry
function Enumerate(str){
	var x;

	switch(str){
		case 'S': x = 75;
			break;
		case 'A+': x = 65;
			break;
		case 'A': x = 50;
			break;
		case 'B+': x = 40;
			break;
		case 'B': x = 25;
			break;
		case 'C+': x = 10;
			break;
		case 'C': x = 0;
			break;
		case 'D+': x = -15;
			break;
		case 'D': x = -25;
			break;
		case 'F+': x = -40;
			break;
		case 'F': x = -50;
			break;
		case 'F-': x = -75;
			break;
		default: x = null;
			break;
	}

	return x;
}


//======================================================================================================
//
//methods for !feat or !f
//
//======================================================================================================

//creates message for bot to send
//for the
function CreateMessage(searchterm, result){
	var message = "";
	message += `Here are the results for \'${searchterm}\': \n\n`;

	for(var i = 0; i < result.length; i++){
		
		var resultName = result[i].name;

		//var resultDescription = result[i].description;
		var resultEffect = result[i].effect;
		var resultClass = result[i].school;
		var resultIsActive = (result[i].type) ? "n Active" : " Passive";	//if true, active skill. if false, passive skill.
		
		var resultPrereq = result[i].prereq;
		var prereqstring = "";
		//var resultStatReq, resultSkillReq, resultMiscReq;

		if(resultPrereq != null){
			var hasreq = false;

			if(resultPrereq.stat_req != null){
				prereqstring += CreatePrereqMessage(resultPrereq.stat_req, "Stat");
				hasreq = true;
			}
			if(resultPrereq.skill_req != null){
				prereqstring += CreatePrereqMessage(resultPrereq.skill_req, "Skill");
				hasreq = true;
			}
			if(resultPrereq.misc_req != null){
				prereqstring += CreatePrereqMessage(resultPrereq.misc_req, "Misc.");
				hasreq = true;
			}
			if(!hasreq){
				prereqstring += "**Skill has no prerequisites.**\n";
			}
		}
		
		message += `\`\`\`css\n${resultName}\n\`\`\`\n`; 			//```text``` in discord formats like code
		message += `${prereqstring}`;
		message += `\nThis is a${resultIsActive} feat.\n`;	//also use ` for string interpolation
		message += `Class: ${resultClass}\n`;
		message += `Effect: ${resultEffect}\n`;
		//message += `\n*${resultDescription}*`;

	}

	return message;
}

function CreatePrereqMessage(prereqs, type){
	var message = "";
	if(prereqs[0] != null){
		message = `**${type} requirements:**`;

		if(type === "Stat"){
				//should look like this:
				//  > B+ in CHA
				//  > C in PER or lower
			for(var i = 0; i < prereqs.length; i++){
				var limit = prereqs[i].stat_limit;					//e.g. B+
				var type = prereqs[i].stat_type.toUpperCase();		//e.g. INT
				var isMin = prereqs[i].is_limit_min;				//e.g. your stat must be lower or higher than INT B+

				message += `\n  > ${limit} in ${type}`;
				if(!isMin) { message+= " or lower"; }				//only if you *cannot* exceed, diff formatting helps it stand out
			}
		}//end if

		else if(type === "Skill" || type === "Misc."){
			for(var j = 0; j < prereqs.length; j++){
				message += `\n  > ${prereqs[j]}`;
			}
		} //end else if
		message += "\n";	//only for formatting... there's probably a better way to do this
	}//end if

	return message;
}

