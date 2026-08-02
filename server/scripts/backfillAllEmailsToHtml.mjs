import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

function stripLatestSubjectPrefix(str = '') {
  return String(str || '').replace(/Latest subject: "[^"]*"\s*/gi, '').trim();
}

function stripHtmlTags(htmlStr = '') {
  return htmlStr
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

function convertTextToOutlookHtml(text = '') {
  let cleanText = stripLatestSubjectPrefix(text);
  if (!cleanText) return '<p style="color: #64748b; font-style: italic;">No email content available.</p>';

  cleanText = cleanText.replace(/â€¯/g, ' ').replace(/\u202f/g, ' ');

  let mainMessage = cleanText;
  let quotedThread = '';

  const quoteMatch = cleanText.match(
    /([\s\S]*?)(?:\r?\n)(On\s+[\s\S]+?wrote:|From:\s+[\s\S]+?Subject:|Von:\s+[\s\S]+?Betreff:|________________________________|>\s?[\s\S]*)/i
  );

  if (quoteMatch && quoteMatch[1].trim()) {
    mainMessage = quoteMatch[1].trim();
    quotedThread = quoteMatch[2].trim();
  } else if (/^>\s?/.test(cleanText)) {
    mainMessage = '';
    quotedThread = cleanText;
  }

  const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const linkify = (s) =>
    s.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noreferrer" style="color: #0284c7; text-decoration: underline;">$1</a>'
    );

  let html = '';

  if (mainMessage) {
    html += `<div style="font-size: 13.5px; font-weight: 600; color: #0f172a; margin-bottom: 14px; line-height: 1.6;">`;
    html += linkify(escapeHtml(mainMessage)).replace(/\n/g, '<br>');
    html += `</div>`;
  }

  if (quotedThread) {
    const cleanThread = quotedThread
      .split(/\r?\n/)
      .map((l) => l.replace(/^>\s?/, ''))
      .join('\n')
      .trim();

    html += `<div style="margin-top: 12px; border-left: 3px solid #0284c7; padding-left: 12px; background: #f8fafc; border-radius: 6px; padding-top: 10px; padding-bottom: 10px;">`;
    html += `<div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #0284c7; margin-bottom: 6px; letter-spacing: 0.05em;">Original Email Thread</div>`;
    html += `<div style="font-size: 12px; color: #475569; line-height: 1.55;">${linkify(escapeHtml(cleanThread)).replace(/\n/g, '<br>')}</div>`;
    html += `</div>`;
  }

  return html;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is required.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB. Starting Fast Bulk Email HTML Backfill...');

  const Reply = mongoose.model('Reply', new mongoose.Schema({}, { strict: false }));
  const Email = mongoose.model('Email', new mongoose.Schema({}, { strict: false }));
  const Task = mongoose.model('Task', new mongoose.Schema({}, { strict: false }));

  // 1. Process Reply Collection
  const replies = await Reply.find({ deletedAt: null }).lean();
  console.log(`Processing ${replies.length} Reply records...`);

  const replyBulkOps = [];
  let repliesFormattedToHtml = 0;

  for (const r of replies) {
    let currentHtml = r.html || '';
    let currentText = stripLatestSubjectPrefix(r.text || '');

    if (/<html|<div|<p|<table/i.test(currentText)) {
      if (!currentHtml) currentHtml = currentText;
      currentText = stripHtmlTags(currentText);
    }

    if (!currentHtml && currentText) {
      currentHtml = convertTextToOutlookHtml(currentText);
      repliesFormattedToHtml++;
    }

    replyBulkOps.push({
      updateOne: {
        filter: { _id: r._id },
        update: { $set: { html: currentHtml, text: currentText } },
      },
    });
  }

  if (replyBulkOps.length > 0) {
    await Reply.bulkWrite(replyBulkOps);
  }

  // 2. Process Email Collection
  const emails = await Email.find({}).lean();
  console.log(`Processing ${emails.length} Email records...`);

  const emailBulkOps = [];
  for (const e of emails) {
    let htmlBody = e.htmlBody || '';
    let body = stripLatestSubjectPrefix(e.body || '');

    if (/<html|<div|<p|<table/i.test(body)) {
      if (!htmlBody) htmlBody = body;
      body = stripHtmlTags(body);
    }

    if (!htmlBody && body) {
      htmlBody = convertTextToOutlookHtml(body);
    }

    emailBulkOps.push({
      updateOne: {
        filter: { _id: e._id },
        update: { $set: { htmlBody, body } },
      },
    });
  }

  if (emailBulkOps.length > 0) {
    await Email.bulkWrite(emailBulkOps);
  }

  // 3. Process Task Collection
  const tasks = await Task.find({ deletedAt: null }).lean();
  console.log(`Processing ${tasks.length} Task records...`);

  const taskBulkOps = [];
  for (const t of tasks) {
    let reply = t.replyId ? await Reply.findById(t.replyId).lean() : null;
    let cleanNotes = stripLatestSubjectPrefix(t.notes || '');

    if (/<html|<div|<p|<table/i.test(cleanNotes)) {
      cleanNotes = reply?.text ? reply.text : stripHtmlTags(cleanNotes);
    }

    if (reply?.text && reply.text !== cleanNotes) {
      cleanNotes = reply.text;
    }

    taskBulkOps.push({
      updateOne: {
        filter: { _id: t._id },
        update: { $set: { notes: cleanNotes } },
      },
    });
  }

  if (taskBulkOps.length > 0) {
    await Task.bulkWrite(taskBulkOps);
  }

  console.log('==================================================');
  console.log(`MASTER BULK EMAIL HTML MIGRATION COMPLETE!`);
  console.log(`Replies processed: ${replyBulkOps.length}`);
  console.log(`Emails processed & updated: ${emailBulkOps.length}`);
  console.log(`Tasks notes cleaned: ${taskBulkOps.length}`);
  console.log('==================================================');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
