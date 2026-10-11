// Minimal D1-compatible wrapper over node:sqlite, so the Worker's tools run unchanged in tests.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export function d1(db) {
  return {
    prepare(sql) {
      const stmt = db.prepare(sql.replace(/\?(\d+)/g, '?'));
      let args = [];
      const api = {
        bind(...a) { args = a; return api; },
        async all() { return { results: stmt.all(...args) }; },
        async first() { return stmt.get(...args) ?? null; },
        async run() { const r = stmt.run(...args); return { meta: { changes: r.changes } }; },
      };
      return api;
    },
  };
}

export function fixtureDb({ ja = [], kendras = [], meta = {} } = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../worker/migrations/0001_init.sql', import.meta.url), 'utf8'));
  const rows = JSON.parse(readFileSync(new URL('./fixtures/med_subset.json', import.meta.url), 'utf8'));
  const ins = db.prepare('INSERT INTO medicines (id,name,manufacturer,salt,ckey,price,pack,unit_price,form,rel,nti,incomplete) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  db.exec('BEGIN');
  for (const r of rows) ins.run(...r);
  const insJ = db.prepare('INSERT INTO ja_products (drug_code,generic_name,unit_size,mrp,group_name,ckey,units,unit_price) VALUES (?,?,?,?,?,?,?,?)');
  for (const r of ja) insJ.run(r.drug_code, r.generic_name, r.unit_size, r.mrp, r.group_name ?? null, r.ckey, r.units, r.unit_price);
  const insK = db.prepare('INSERT INTO kendras (code,name,address,district,state,pin,lat,lng,phone) VALUES (?,?,?,?,?,?,?,?,?)');
  for (const k of kendras) insK.run(k.code, k.name, k.address ?? '', k.district ?? '', k.state ?? '', k.pin, k.lat ?? null, k.lng ?? null, k.phone ?? null);
  const insM = db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(meta)) insM.run(k, v);
  db.exec('COMMIT');
  return d1(db);
}
