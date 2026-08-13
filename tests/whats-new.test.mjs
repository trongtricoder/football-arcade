import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import {hasUnreadRelease,sortReleasesNewestFirst,WHATS_NEW_STORAGE_KEY} from "../lib/whats-new.ts";

const root=new URL("../",import.meta.url);

test("release data is versioned, complete, and displayed newest first",async()=>{
  const data=JSON.parse(await readFile(new URL("data/whats-new.v1.json",root),"utf8"));
  assert.equal(data.schemaVersion,1);
  assert.ok(data.releases.length>=1);
  for(const release of data.releases){
    assert.match(release.version,/^\d+\.\d+\.\d+$/);
    assert.match(release.releaseDate,/^\d{4}-\d{2}-\d{2}$/);
    assert.ok(release.title&&release.summary);
    assert.ok(Object.keys(release.changes).every(category=>["New","Improved","Fixed","Data"].includes(category)));
    assert.ok(Object.values(release.changes).flat().every(change=>typeof change==="string"&&change.length>0));
  }
  assert.deepEqual(sortReleasesNewestFirst(data.releases).map(release=>release.version),data.releases.map(release=>release.version));
});

test("unread state follows the latest locally viewed version",()=>{
  assert.equal(WHATS_NEW_STORAGE_KEY,"football-arcade:last-viewed-release");
  assert.equal(hasUnreadRelease("0.1.0",null),true);
  assert.equal(hasUnreadRelease("0.1.0","0.0.9"),true);
  assert.equal(hasUnreadRelease("0.1.0","0.1.0"),false);
});

test("What’s New is available in both navigation menus and uses an accessible modal",async()=>{
  const [app,modal,styles]=await Promise.all([
    readFile(new URL("app/football-arcade.tsx",root),"utf8"),
    readFile(new URL("app/whats-new-modal.tsx",root),"utf8"),
    readFile(new URL("app/whats-new-modal.css",root),"utf8")
  ]);
  assert.equal((app.match(/className="nav-whats-new"/g)||[]).length,2);
  assert.match(app,/window\.localStorage\.setItem\(WHATS_NEW_STORAGE_KEY,latestWhatsNewVersion\)/);
  assert.match(app,/storage is unavailable/);
  assert.match(modal,/role="dialog"/);
  assert.match(modal,/aria-modal="true"/);
  assert.match(modal,/aria-labelledby=\{titleId\}/);
  assert.match(modal,/event\.key==="Escape"/);
  assert.match(modal,/event\.key!=="Tab"/);
  assert.match(modal,/document\.body\.style\.overflow="hidden"/);
  assert.doesNotMatch(modal,/Â|â€™|Ã—/);
  assert.match(styles,/overflow-x:hidden/);
  assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/);
});
