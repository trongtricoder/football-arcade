export const WHATS_NEW_STORAGE_KEY="football-arcade:last-viewed-release";

export type ReleaseLabel="latest"|"major update";
export type ChangeCategory="New"|"Improved"|"Fixed"|"Data";
export type WhatsNewRelease={version:string;releaseDate:string;title:string;summary:string;label?:ReleaseLabel;changes:Partial<Record<ChangeCategory,string[]>>};

export function sortReleasesNewestFirst(releases:WhatsNewRelease[]){
  return [...releases].sort((a,b)=>b.releaseDate.localeCompare(a.releaseDate)||b.version.localeCompare(a.version,undefined,{numeric:true}));
}

export function hasUnreadRelease(latestVersion:string,lastViewedVersion:string|null){
  return Boolean(latestVersion&&latestVersion!==lastViewedVersion);
}
