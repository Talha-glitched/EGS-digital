import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../db/index.js';
import { writeAuditLog } from './auditService.js';
import { getUploadSubdir } from '../utils/uploadPath.js';

const uploadRoot = getUploadSubdir('job-memory');

export const JOB_MEMORY_TYPES = Object.freeze([
  'brief',
  'requirement',
  'update',
  'client_comment',
  'decision',
  'approval',
  'issue',
  'site_update',
  'production_update',
  'installation_update',
  'photo',
  'resolution',
  'learning',
]);

const VALID_TYPES = new Set(JOB_MEMORY_TYPES);

export function normalizeJobMemoryType(value) {
  const normalized = String(value || 'update').trim().toLowerCase();
  return VALID_TYPES.has(normalized) ? normalized : 'update';
}

function safeFileName(value) {
  const base = path.basename(String(value || 'attachment'));
  return base.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 180) || 'attachment';
}

function mapAttachment(row) {
  return {
    id: row.id,
    fileName: row.file_name,
    url: row.public_url,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes) || 0,
    checksumSha256: row.checksum_sha256,
    createdAt: row.created_at,
  };
}

function mapEntry(row) {
  return {
    id: row.id,
    type: row.note_type,
    content: row.content,
    currentVersion: row.current_version_number,
    pinned: Boolean(row.is_pinned),
    author: row.author_name || 'EGS Team',
    authorUserId: row.author_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attachments: Array.isArray(row.attachments) ? row.attachments.map(mapAttachment) : [],
    communicationSource: row.communication_source || null,
  };
}

async function assertJob(client, jobId) {
  const result = await client.query(
    'SELECT id FROM ongoing_jobs WHERE id = $1::uuid AND deleted_at IS NULL LIMIT 1',
    [jobId],
  );
  if (!result.rows.length) {
    const error = new Error('Ongoing Job not found.');
    error.status = 404;
    throw error;
  }
}

async function storeFiles({ client, jobId, noteId, noteVersionId, files, actor }) {
  if (!files?.length) return [];
  const targetDir = path.join(uploadRoot, String(jobId), String(noteId));
  await fs.mkdir(targetDir, { recursive: true });
  const written = [];

  try {
    for (const file of files) {
      const storedName = `${crypto.randomUUID()}-${safeFileName(file.originalname)}`;
      const storagePath = path.join(targetDir, storedName);
      const publicUrl = `/uploads/job-memory/${jobId}/${noteId}/${storedName}`;
      const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
      await fs.writeFile(storagePath, file.buffer, { flag: 'wx' });
      written.push(storagePath);
      await client.query(
        `INSERT INTO note_attachments (
           note_version_id, file_name, storage_path, public_url, mime_type,
           size_bytes, checksum_sha256, uploaded_by_user_id
         ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8::uuid)`,
        [
          noteVersionId,
          file.originalname,
          storagePath,
          publicUrl,
          file.mimetype || null,
          file.size || file.buffer.length,
          checksum,
          actor?.userId || null,
        ],
      );
    }
    return written;
  } catch (error) {
    await Promise.all(written.map((filePath) => fs.unlink(filePath).catch(() => {})));
    throw error;
  }
}

async function loadEntry(client, noteId) {
  const result = await client.query(
    `SELECT n.id, n.note_type, n.content, n.current_version_number, n.is_pinned,
            n.author_user_id, n.created_at, n.updated_at,
            COALESCE(u.name, 'EGS Team') AS author_name,
            COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'id', na.id,
                  'file_name', na.file_name,
                  'public_url', na.public_url,
                  'mime_type', na.mime_type,
                  'size_bytes', na.size_bytes,
                  'checksum_sha256', na.checksum_sha256,
                  'created_at', na.created_at
                ) ORDER BY na.created_at
              ) FILTER (WHERE na.id IS NOT NULL),
              '[]'::jsonb
            ) AS attachments,
            (
              SELECT jsonb_build_object(
                'conversationId', cjl.conversation_id,
                'messageId', cja.message_id,
                'actionType', cja.action_type,
                'linkedAt', cja.created_at
              )
              FROM communication_job_actions cja
              JOIN conversation_job_links cjl ON cjl.id = cja.conversation_job_link_id
              WHERE cja.target_table = 'notes' AND cja.target_entity_id = n.id
              ORDER BY cja.created_at DESC
              LIMIT 1
            ) AS communication_source
     FROM notes n
     LEFT JOIN users u ON u.id = n.author_user_id
     LEFT JOIN note_versions nv
       ON nv.note_id = n.id AND nv.version_number = n.current_version_number
     LEFT JOIN note_attachments na ON na.note_version_id = nv.id
     WHERE n.id = $1::uuid
     GROUP BY n.id, u.name`,
    [noteId],
  );
  return result.rows[0] ? mapEntry(result.rows[0]) : null;
}

export async function listJobMemory(jobId, { limit = 100 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 250);
  const result = await db.query(
    `SELECT n.id, n.note_type, n.content, n.current_version_number, n.is_pinned,
            n.author_user_id, n.created_at, n.updated_at,
            COALESCE(u.name, 'EGS Team') AS author_name,
            COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'id', na.id,
                  'file_name', na.file_name,
                  'public_url', na.public_url,
                  'mime_type', na.mime_type,
                  'size_bytes', na.size_bytes,
                  'checksum_sha256', na.checksum_sha256,
                  'created_at', na.created_at
                ) ORDER BY na.created_at
              ) FILTER (WHERE na.id IS NOT NULL),
              '[]'::jsonb
            ) AS attachments,
            (
              SELECT jsonb_build_object(
                'conversationId', cjl.conversation_id,
                'messageId', cja.message_id,
                'actionType', cja.action_type,
                'linkedAt', cja.created_at
              )
              FROM communication_job_actions cja
              JOIN conversation_job_links cjl ON cjl.id = cja.conversation_job_link_id
              WHERE cja.target_table = 'notes' AND cja.target_entity_id = n.id
              ORDER BY cja.created_at DESC
              LIMIT 1
            ) AS communication_source
     FROM notes n
     LEFT JOIN users u ON u.id = n.author_user_id
     LEFT JOIN note_versions nv
       ON nv.note_id = n.id AND nv.version_number = n.current_version_number
     LEFT JOIN note_attachments na ON na.note_version_id = nv.id
     WHERE n.target_entity_type = 'ongoing_job'
       AND n.target_entity_id = $1::uuid
       AND n.archived_at IS NULL
     GROUP BY n.id, u.name
     ORDER BY n.is_pinned DESC, n.updated_at DESC
     LIMIT $2`,
    [jobId, safeLimit],
  );
  return { items: result.rows.map(mapEntry), types: JOB_MEMORY_TYPES };
}

export async function listJobMemoryVersions(jobId, noteId) {
  const result = await db.query(
    `SELECT nv.id, nv.version_number, nv.content, nv.change_reason, nv.created_at,
            COALESCE(u.name, 'EGS Team') AS author_name,
            COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'id', na.id,
                  'file_name', na.file_name,
                  'public_url', na.public_url,
                  'mime_type', na.mime_type,
                  'size_bytes', na.size_bytes,
                  'checksum_sha256', na.checksum_sha256,
                  'created_at', na.created_at
                ) ORDER BY na.created_at
              ) FILTER (WHERE na.id IS NOT NULL),
              '[]'::jsonb
            ) AS attachments
     FROM note_versions nv
     JOIN notes n ON n.id = nv.note_id
     LEFT JOIN users u ON u.id = nv.created_by_user_id
     LEFT JOIN note_attachments na ON na.note_version_id = nv.id
     WHERE n.id = $1::uuid
       AND n.target_entity_type = 'ongoing_job'
       AND n.target_entity_id = $2::uuid
     GROUP BY nv.id, u.name
     ORDER BY nv.version_number DESC`,
    [noteId, jobId],
  );
  return {
    items: result.rows.map((row) => ({
      id: row.id,
      version: row.version_number,
      content: row.content,
      changeReason: row.change_reason,
      author: row.author_name,
      createdAt: row.created_at,
      attachments: row.attachments.map(mapAttachment),
    })),
  };
}

export async function createJobMemoryEntry(jobId, payload = {}, files = [], actor = {}) {
  const content = String(payload.content || '').trim();
  if (!content && !files.length) {
    const error = new Error('Add a note or attach at least one file.');
    error.status = 400;
    throw error;
  }

  const client = await db.getClient();
  let written = [];
  try {
    await client.query('BEGIN');
    await assertJob(client, jobId);
    const noteResult = await client.query(
      `INSERT INTO notes (
         target_entity_type, target_entity_id, author_user_id, note_type,
         content, current_version_number, is_pinned, updated_at
       ) VALUES ('ongoing_job', $1::uuid, $2::uuid, $3, $4, 1, $5, NOW())
       RETURNING id`,
      [jobId, actor?.userId || null, normalizeJobMemoryType(payload.type), content, payload.pinned === true || payload.pinned === 'true'],
    );
    const noteId = noteResult.rows[0].id;
    const versionResult = await client.query(
      `INSERT INTO note_versions (note_id, version_number, content, change_reason, created_by_user_id)
       VALUES ($1::uuid, 1, $2, $3, $4::uuid)
       RETURNING id`,
      [noteId, content, String(payload.changeReason || '').trim() || 'Initial entry', actor?.userId || null],
    );
    written = await storeFiles({ client, jobId, noteId, noteVersionId: versionResult.rows[0].id, files, actor });
    const entry = await loadEntry(client, noteId);
    await client.query('COMMIT');
    await writeAuditLog({
      userId: actor?.userId,
      userDisplayName: actor?.displayName || 'EGS Team',
      action: 'create',
      resource: 'job_memory',
      resourceId: noteId,
      summary: `Added ${entry.type.replaceAll('_', ' ')} to Ongoing Job`,
      metadata: { ongoingJobId: jobId, version: 1, attachmentCount: entry.attachments.length },
    });
    return entry;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    await Promise.all(written.map((filePath) => fs.unlink(filePath).catch(() => {})));
    throw error;
  } finally {
    client.release();
  }
}

export async function reviseJobMemoryEntry(jobId, noteId, payload = {}, files = [], actor = {}) {
  const content = String(payload.content || '').trim();
  if (!content && !files.length) {
    const error = new Error('The revised note cannot be empty.');
    error.status = 400;
    throw error;
  }

  const client = await db.getClient();
  let written = [];
  try {
    await client.query('BEGIN');
    await assertJob(client, jobId);
    const currentResult = await client.query(
      `SELECT id, content, current_version_number, note_type, is_pinned
       FROM notes
       WHERE id = $1::uuid AND target_entity_type = 'ongoing_job'
         AND target_entity_id = $2::uuid AND archived_at IS NULL
       FOR UPDATE`,
      [noteId, jobId],
    );
    if (!currentResult.rows.length) {
      const error = new Error('Job Memory entry not found.');
      error.status = 404;
      throw error;
    }

    const current = currentResult.rows[0];
    const nextVersion = Number(current.current_version_number) + 1;
    const nextContent = content || current.content;
    const versionResult = await client.query(
      `INSERT INTO note_versions (note_id, version_number, content, change_reason, created_by_user_id)
       VALUES ($1::uuid, $2, $3, $4, $5::uuid)
       RETURNING id`,
      [noteId, nextVersion, nextContent, String(payload.changeReason || '').trim() || null, actor?.userId || null],
    );

    if (payload.keepAttachments !== 'false') {
      await client.query(
        `INSERT INTO note_attachments (
           note_version_id, file_name, storage_path, public_url, mime_type,
           size_bytes, checksum_sha256, uploaded_by_user_id, created_at
         )
         SELECT $1::uuid, na.file_name, na.storage_path, na.public_url, na.mime_type,
                na.size_bytes, na.checksum_sha256, na.uploaded_by_user_id, na.created_at
         FROM note_attachments na
         JOIN note_versions prior ON prior.id = na.note_version_id
         WHERE prior.note_id = $2::uuid AND prior.version_number = $3`,
        [versionResult.rows[0].id, noteId, current.current_version_number],
      );
    }

    written = await storeFiles({ client, jobId, noteId, noteVersionId: versionResult.rows[0].id, files, actor });
    await client.query(
      `UPDATE notes SET
         content = $3,
         note_type = $4,
         is_pinned = $5,
         current_version_number = $6,
         updated_at = NOW()
       WHERE id = $1::uuid AND target_entity_id = $2::uuid`,
      [
        noteId,
        jobId,
        nextContent,
        normalizeJobMemoryType(payload.type || current.note_type),
        payload.pinned === undefined ? current.is_pinned : payload.pinned === true || payload.pinned === 'true',
        nextVersion,
      ],
    );
    const entry = await loadEntry(client, noteId);
    await client.query('COMMIT');
    await writeAuditLog({
      userId: actor?.userId,
      userDisplayName: actor?.displayName || 'EGS Team',
      action: 'update',
      resource: 'job_memory',
      resourceId: noteId,
      summary: `Revised Job Memory entry to version ${nextVersion}`,
      changes: [{ field: 'content', from: current.content, to: nextContent }],
      metadata: { ongoingJobId: jobId, version: nextVersion, attachmentCount: entry.attachments.length },
    });
    return entry;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    await Promise.all(written.map((filePath) => fs.unlink(filePath).catch(() => {})));
    throw error;
  } finally {
    client.release();
  }
}
