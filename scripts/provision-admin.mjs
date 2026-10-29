#!/usr/bin/env node
/**
 * CleanVillage - Secure Server-Side Administrator Provisioning Script
 * ============================================================================
 * Usage:
 *   npm run provision:admin
 *   (or: node scripts/provision-admin.mjs)
 *
 * Security Design:
 * - Runs ONLY in a trusted server-side Node.js terminal environment.
 * - Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env or environment.
 * - Never hardcodes the administrator email or password in frontend or repo code.
 * - Never automatically promotes an arbitrary citizen account without explicit
 *   provisioning.
 * - If ADMIN_PROVISION_EMAIL or ADMIN_PROVISION_PASSWORD are not set in .env,
 *   securely prompts for them in the terminal.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

function isJwtToken(token) {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (trimmed.startsWith('sb_publishable_') || trimmed.startsWith('sb_secret_')) {
    return false;
  }
  const parts = trimmed.split('.');
  return parts.length === 3 && trimmed.startsWith('eyJ');
}

async function main() {
  loadDotEnv();

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const serviceRoleKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    ''
  ).trim();

  if (
    !supabaseUrl ||
    supabaseUrl.includes('your-project-ref') ||
    !serviceRoleKey ||
    serviceRoleKey.includes('your-private-service-role-key') ||
    serviceRoleKey.includes('your-private-supabase-secret-key')
  ) {
    console.error(
      '\n[ERROR] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) in your local .env file.'
    );
    console.error(
      'Please add your Supabase URL and private secret / service-role key (sb_secret_... or legacy eyJ... service_role JWT) to .env first.\n'
    );
    process.exit(1);
  }

  const rl = readline.createInterface({ input, output });

  try {
    let adminEmail = (process.env.ADMIN_PROVISION_EMAIL || '').trim().toLowerCase();
    if (!adminEmail || adminEmail.includes('your-private-admin-email')) {
      adminEmail = (await rl.question('Enter dedicated Administrator Email (@gmail.com): ')).trim().toLowerCase();
    }

    let adminPassword = (process.env.ADMIN_PROVISION_PASSWORD || '').trim();
    if (!adminPassword || adminPassword.includes('your-strong-private-admin-password')) {
      adminPassword = (await rl.question('Enter dedicated Administrator Password (min 8 chars): ')).trim();
    }

    let adminFullName = (process.env.ADMIN_PROVISION_FULL_NAME || '').trim();
    if (!adminFullName) {
      adminFullName =
        (await rl.question('Enter Administrator Display Name [CleanVillage Sanitation Administrator]: ')).trim() ||
        'CleanVillage Sanitation Administrator';
    }

    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(adminEmail)) {
      console.error('\n[ERROR] Administrator email must be a valid @gmail.com address.');
      process.exit(1);
    }

    if (adminPassword.length < 8) {
      console.error('\n[ERROR] Administrator password must be at least 8 characters long.');
      process.exit(1);
    }

    // Support both new `sb_secret_...` API keys and legacy `eyJ...` service_role JWTs.
    // Only attach Authorization: Bearer when the key is a 3-part JWT.
    const headers = {
      apikey: serviceRoleKey,
      'Content-Type': 'application/json',
    };
    if (isJwtToken(serviceRoleKey)) {
      headers.Authorization = `Bearer ${serviceRoleKey}`;
    }

    // 1. Check if a different administrator already exists in public.profiles
    const existingAdminRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?role=eq.authority&select=id,email,full_name`,
      { headers }
    );

    if (!existingAdminRes.ok) {
      const errText = await existingAdminRes.text();
      console.error('\n[ERROR] Could not query public.profiles. Ensure SQL migrations have been applied first.');
      console.error(errText);
      process.exit(1);
    }

    const existingAdmins = await existingAdminRes.json();
    if (existingAdmins.length > 0 && existingAdmins[0].email.toLowerCase() !== adminEmail) {
      console.error(
        `\n[ERROR] A single Administrator account is already provisioned (${existingAdmins[0].email}).`
      );
      console.error(
        'CleanVillage enforces a single dedicated Administrator. Revoke the existing authority role in Supabase before provisioning a different email.\n'
      );
      process.exit(1);
    }

    // 2. Check if this email already exists as a citizen profile (do NOT silently promote a citizen)
    const existingProfileRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(adminEmail)}&select=id,email,role`,
      { headers }
    );
    const existingProfiles = existingProfileRes.ok ? await existingProfileRes.json() : [];

    if (existingProfiles.length > 0 && existingProfiles[0].role !== 'authority') {
      console.error(
        `\n[ERROR] The email "${adminEmail}" is currently registered as a "${existingProfiles[0].role}" account.`
      );
      console.error(
        'For security, this script never automatically promotes an existing citizen account to Administrator. Please use a dedicated Administrator email.\n'
      );
      process.exit(1);
    }

    let userId = existingProfiles[0]?.id || null;

    if (!userId) {
      // 3. Create the dedicated Administrator in Supabase Auth via Admin API
      const createAuthRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
          email_confirm: true,
          user_metadata: {
            full_name: adminFullName,
          },
        }),
      });

      const createAuthData = await createAuthRes.json();
      if (!createAuthRes.ok) {
        console.error('\n[ERROR] Failed to create Administrator in Supabase Auth:', createAuthData.msg || createAuthData.message || createAuthData);
        process.exit(1);
      }
      userId = createAuthData.id;
    } else {
      // Update password & confirm email for existing authority account
      const updateAuthRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          password: adminPassword,
          email_confirm: true,
          user_metadata: {
            full_name: adminFullName,
          },
        }),
      });
      if (!updateAuthRes.ok) {
        const errData = await updateAuthRes.json();
        console.error('\n[ERROR] Failed to update Administrator credentials:', errData);
        process.exit(1);
      }
    }

    // 4. Upsert the Administrator profile with role = 'authority' using service_role
    const upsertProfileRes = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        id: userId,
        email: adminEmail,
        full_name: adminFullName,
        role: 'authority',
        village: 'All India Sanitation Authority',
        household_area: 'Central Sanitation Control Room',
        opt_in_leaderboard: false,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!upsertProfileRes.ok) {
      const errText = await upsertProfileRes.text();
      console.error('\n[ERROR] Failed to set authority role on public.profiles:', errText);
      process.exit(1);
    }

    console.log('\n====================================================================');
    console.log('SUCCESS: Dedicated CleanVillage Administrator Account Provisioned!');
    console.log(`Admin User UUID : ${userId}`);
    console.log(`Admin Email     : ${adminEmail}`);
    console.log(`Assigned Role   : authority`);
    console.log('====================================================================\n');
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error('\n[FATAL] Administrator provisioning failed:', err.message);
  process.exit(1);
});
