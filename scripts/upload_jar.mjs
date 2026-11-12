import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { supabaseAdmin } from '../server/supabaseAdmin.js';

dotenv.config();

async function main() {
  const jarPath = 'C:/Users/devim/Downloads/randomshits/5.55 source code/build/libs/CrosshairAddons-2.2.0+1.21.11.jar';
  const jarBuf = fs.readFileSync(jarPath);
  const hash = crypto.createHash('sha256').update(jarBuf).digest('hex');
  console.log(`Uploading CrosshairAddons-2.2.0+1.21.11.jar (${jarBuf.length} bytes, SHA256: ${hash})...`);

  const { error } = await supabaseAdmin.storage.from('releases').upload('CrosshairAddons-2.2.0+1.21.11.jar', jarBuf, {
    contentType: 'application/java-archive',
    upsert: true,
  });

  if (error) {
    console.error('Storage upload error:', error);
    process.exit(1);
  }

  console.log('✓ Successfully uploaded CrosshairAddons-2.2.0+1.21.11.jar to Supabase Storage!');

  // Also check products in DB
  const { data: prods } = await supabaseAdmin.from('products').select('*');
  console.log('Current DB products:', prods.map(p => ({ id: p.id, slug: p.slug, name: p.name, platform: p.platform })));
}

main();
