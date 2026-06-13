/**
 * StandardCraft Resource Seeder
 *
 * Uploads the 50 .md resource files from src/content/resources/ to Supabase Storage
 * and seeds the public.resources table with metadata extracted from frontmatter.
 *
 * Usage:
 *   node scripts/seed-resources.js            # live run
 *   node scripts/seed-resources.js --dry-run  # preview without writing
 *
 * Requires .env in project root with:
 *   PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env manually (no dotenv dependency required)
async function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env');
    const contents = await readFile(envPath, 'utf-8');
    for (const line of contents.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] = process.env[key] ?? val;
    }
  } catch {
    // .env may not exist in CI — rely on actual env vars
  }
}

/** Extract frontmatter between --- delimiters */
function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};

  const fm = {};
  const lines = match[1].split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) { i++; continue; }

    const key = line.slice(0, colonIdx).trim();
    const rawVal = line.slice(colonIdx + 1).trim();

    // Detect multi-line arrays
    if (rawVal === '' || rawVal === '[]') {
      const arr = [];
      i++;
      while (i < lines.length && lines[i].trim().startsWith('-')) {
        const item = lines[i].trim().slice(1).trim();
        // Sub-object (standards array)
        if (lines[i + 1]?.trim().startsWith('code:') || item === '') {
          const obj = {};
          while (i < lines.length && (lines[i].trim().startsWith('-') || lines[i + 1]?.match(/^\s{2,}\w/))) {
            i++;
            if (!lines[i]) break;
            const subColon = lines[i].indexOf(':');
            if (subColon !== -1 && lines[i].match(/^\s+\w/)) {
              const sk = lines[i].slice(0, subColon).trim();
              const sv = lines[i].slice(subColon + 1).trim().replace(/^["']|["']$/g, '');
              obj[sk] = sv;
            } else if (lines[i].trim().startsWith('-')) {
              if (Object.keys(obj).length > 0) { arr.push({...obj}); Object.keys(obj).forEach(k => delete obj[k]); }
              break;
            }
          }
          if (Object.keys(obj).length > 0) arr.push({...obj});
        } else {
          arr.push(item.replace(/^["']|["']$/g, ''));
          i++;
        }
      }
      fm[key] = rawVal === '[]' ? [] : arr;
      continue;
    }

    // Inline array
    if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
      fm[key] = rawVal.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    } else if (rawVal === 'true') {
      fm[key] = true;
    } else if (rawVal === 'false') {
      fm[key] = false;
    } else {
      fm[key] = rawVal.replace(/^["']|["']$/g, '');
    }
    i++;
  }

  return fm;
}

function creditCostForType(resourceType) {
  return 1;
}

async function main() {
  await loadEnv();

  const isDryRun = process.argv.includes('--dry-run');
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const resourcesDir = join(__dirname, '..', 'src', 'content', 'resources');
  const files = (await readdir(resourcesDir)).filter(f => f.endsWith('.md'));

  console.log(`Found ${files.length} resource files.`);
  if (isDryRun) console.log('DRY RUN — no changes will be made.\n');

  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const filePath = join(resourcesDir, file);
    const content = await readFile(filePath, 'utf-8');
    const fm = parseFrontmatter(content);

    const slug = basename(file, '.md');
    const storagePath = `resources/${slug}.md`;
    const creditCost = creditCostForType(fm.resource_type || '');

    console.log(`→ ${slug} | ${fm.resource_type} | ${creditCost} credit(s)`);

    if (isDryRun) {
      successCount++;
      continue;
    }

    // Upload to Supabase Storage (private bucket: 'resources')
    const { error: uploadError } = await supabase.storage
      .from('resources')
      .upload(storagePath, Buffer.from(content), {
        contentType: 'text/markdown',
        upsert: true,
      });

    if (uploadError) {
      console.error(`  ✗ Storage upload failed: ${uploadError.message}`);
      errorCount++;
      continue;
    }

    // Upsert into resources table
    const { error: dbError } = await supabase.from('resources').upsert({
      slug,
      title: fm.title || slug,
      subject: fm.subject || '',
      grade: fm.grade || '',
      grade_band: fm.grade_band || null,
      resource_type: fm.resource_type || '',
      standards: Array.isArray(fm.standards) ? fm.standards : [],
      file_path: storagePath,
      credit_cost: creditCost,
      status: fm.is_sale_ready ? 'published' : 'draft',
    }, { onConflict: 'slug' });

    if (dbError) {
      console.error(`  ✗ DB upsert failed: ${dbError.message}`);
      errorCount++;
      continue;
    }

    console.log(`  ✓ Uploaded + seeded`);
    successCount++;
  }

  console.log(`\nDone. ${successCount} succeeded, ${errorCount} failed.`);
  if (errorCount > 0) process.exit(1);
}

main().catch(err => {
  console.error('Seed script error:', err);
  process.exit(1);
});
