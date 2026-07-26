import playerData from "@/data/players.json";
import playerExpansion from "@/data/player-expansion.json";
import playerOverrides from "@/data/player-overrides.json";
import playerRoles from "@/data/player-roles.json";
import balanceConfig from "@/data/balance-config.json";

type Group = "GK" | "DEF" | "MID" | "ATT";
type Raw = { name:string; pos:Group; era:string; club:string; attrs:number[]; activeYears:number[] };
const raw = [...playerData,...playerExpansion] as Raw[];
const timeless = new Set<string>(playerOverrides.timeless);
const ratings = playerOverrides.ratings as Record<string,number>;
const roles = playerRoles.roles as Record<string,string[]>;

function base(player:Raw){const override=ratings[`${player.name}|${player.era}`]??ratings[player.name];if(override)return override;const weights=balanceConfig.overallWeights[player.pos];return Math.round(player.attrs.reduce((sum,value,index)=>sum+value*weights[index],0))}
function eraFit(player:Raw,era:string){if(timeless.has(player.name))return 100;const starts:Record<string,number>={"80s":1980,"90s":1990,"00s":2000,"10s":2010,"20s":2020},start=starts[era],end=start+9,[careerStart,careerEnd]=player.activeYears,gap=careerEnd<start?start-careerEnd:careerStart>end?careerStart-end:0,fit=gap===0?100:gap<=5?94:gap<=10?89:gap<=20?82:75,style=era==="80s"?(player.attrs[5]>90?2:0):era==="90s"?(player.attrs[3]>90?2:0):era==="00s"?(player.attrs[2]>90?2:0):era==="10s"?(player.attrs[0]>90?2:0):(player.attrs[2]>90?2:0);return Math.min(100,fit+style)}
function positionFit(player:Raw,slot:string){const target=slot.replace(/\d+$/,"");if(target==="GK")return player.pos==="GK"?100:50;if(player.pos==="GK")return 45;const natural:Record<Group,string[]>={GK:["GK"],DEF:["LB","CB","RB","DM"],MID:["LM","CM","RM","AM","DM"],ATT:["LW","ST","RW","AM"]},explicit=roles[`${player.name}|${player.era}`]||roles[player.name]||[],playable=new Set([...natural[player.pos],...explicit]);if(playable.has(target))return 100;if(player.pos==="ATT")return ["LM","CM","RM"].includes(target)?72:55;if(player.pos==="MID")return ["LW","ST","RW","CF","LF","RF"].includes(target)?82:76;return ["LM","CM","RM","AM"].includes(target)?70:55}

export function getRosterPlayer(playerId:string,slot:string,era:string){const index=Number(playerId.replace(/^p/,"")),player=Number.isInteger(index)?raw[index]:undefined;if(!player)return null;const ef=eraFit(player,era),pf=positionFit(player,slot);return{name:player.name,club:player.club,role:player.pos,baseRating:base(player),realRating:Math.min(101,Math.round(base(player)*ef/100*pf/100)),eraFit:ef,positionFit:pf,attrs:player.attrs}}
