-- Full-text search index for the NPC catalogue.
-- External-content FTS5 keeps the searchable index synchronized with npc_profiles.
CREATE VIRTUAL TABLE IF NOT EXISTS npc_profiles_fts USING fts5(
 id,
 name,
 role,
 personality,
 routine,
 greeting,
 dialogue,
 content='npc_profiles',
 content_rowid='rowid',
 tokenize='unicode61 remove_diacritics 2',
 prefix='2 3 4'
);

CREATE TRIGGER IF NOT EXISTS npc_profiles_fts_ai AFTER INSERT ON npc_profiles BEGIN
 INSERT INTO npc_profiles_fts(rowid,id,name,role,personality,routine,greeting,dialogue)
 VALUES(new.rowid,new.id,new.name,new.role,new.personality,new.routine,new.greeting,new.dialogue);
END;

CREATE TRIGGER IF NOT EXISTS npc_profiles_fts_ad AFTER DELETE ON npc_profiles BEGIN
 INSERT INTO npc_profiles_fts(npc_profiles_fts,rowid,id,name,role,personality,routine,greeting,dialogue)
 VALUES('delete',old.rowid,old.id,old.name,old.role,old.personality,old.routine,old.greeting,old.dialogue);
END;

CREATE TRIGGER IF NOT EXISTS npc_profiles_fts_au AFTER UPDATE ON npc_profiles BEGIN
 INSERT INTO npc_profiles_fts(npc_profiles_fts,rowid,id,name,role,personality,routine,greeting,dialogue)
 VALUES('delete',old.rowid,old.id,old.name,old.role,old.personality,old.routine,old.greeting,old.dialogue);
 INSERT INTO npc_profiles_fts(rowid,id,name,role,personality,routine,greeting,dialogue)
 VALUES(new.rowid,new.id,new.name,new.role,new.personality,new.routine,new.greeting,new.dialogue);
END;

-- Index all 1,200 profiles already present before this migration.
INSERT INTO npc_profiles_fts(npc_profiles_fts) VALUES('rebuild');
