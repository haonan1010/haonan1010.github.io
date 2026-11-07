-- 在现有项目的 SQL Editor 中执行。只扩展榜单类型，不删除玩家或成绩。
BEGIN;
DO $$
DECLARE constraint_row record;
BEGIN
  FOR constraint_row IN
    SELECT c.conname FROM pg_constraint c
    WHERE c.conrelid = 'public.scores'::regclass AND c.contype = 'c'
      AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.scores'::regclass AND attname = 'board')]::smallint[]
  LOOP
    EXECUTE format('ALTER TABLE public.scores DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;
END $$;
ALTER TABLE public.scores ADD CONSTRAINT scores_board_check CHECK (board IN ('speed10','waves','dash','combo'));
COMMIT;
