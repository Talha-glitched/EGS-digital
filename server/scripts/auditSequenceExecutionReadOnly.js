import db from '../src/db/index.js';

try {
  const tables = ['sequences','sequence_versions','sequence_steps','sequence_launches','sequence_enrollments','send_jobs'];
  const columns = await db.query(
    `SELECT table_name,column_name,data_type,is_nullable,column_default
     FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[])
     ORDER BY table_name,ordinal_position`, [tables],
  );
  const counts = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM sequences)::int AS sequences,
      (SELECT COUNT(*) FROM sequence_versions)::int AS versions,
      (SELECT COUNT(*) FROM sequence_steps)::int AS steps,
      (SELECT COUNT(*) FROM sequence_launches)::int AS launches,
      (SELECT COUNT(*) FROM sequence_enrollments)::int AS enrollments,
      (SELECT COUNT(*) FROM send_jobs)::int AS send_jobs
  `);
  const states = await db.query(`
    SELECT 'enrollment' AS kind,execution_state AS state,COUNT(*)::int AS count FROM sequence_enrollments GROUP BY execution_state
    UNION ALL SELECT 'send_job',status,COUNT(*)::int FROM send_jobs GROUP BY status ORDER BY kind,state
  `);
  console.log(JSON.stringify({ columns: columns.rows, counts: counts.rows[0], states: states.rows }));
} finally {
  await db.getPool().end();
}
