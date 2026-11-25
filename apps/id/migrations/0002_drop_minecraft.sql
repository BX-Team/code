drop table "minecraftProfile";
delete from "activity" where "kind" in ('minecraft-linked', 'minecraft-unlinked');
