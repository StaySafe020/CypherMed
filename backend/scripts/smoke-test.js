const base = 'http://localhost:3000/api';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  try {
    console.log('Starting smoke test against', base);
    await wait(800);

    // 1) Create patient
    const wallet = 'smoke-wallet-' + Date.now();
    const patientResp = await fetch(`${base}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, name: 'Smoke Patient', dob: new Date('1990-01-01').toISOString() }),
    });
    const patient = await patientResp.json();
    console.log('Created patient:', patient.id || patient);

    // 2) Create record
    const recordResp = await fetch(`${base}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: patient.id, recordType: 'generalMedical', dataHash: 'hash1', storagePath: null, metadata: { note: 'smoke' }, accessor: 'smoke-tester' }),
    });
    const record = await recordResp.json();
    console.log('Created record:', record.id || record);

    // 3) Get record
    await wait(300);
    const getRecord = await fetch(`${base}/records/${record.id}?accessor=smoke-tester`);
    const got = await getRecord.json();
    console.log('Fetched record dataHash:', got.dataHash);

    // 4) Update record
    const patchResp = await fetch(`${base}/records/${record.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataHash: 'hash2', accessor: 'smoke-tester' }),
    });
    const patched = await patchResp.json();
    console.log('Patched record dataHash:', patched.dataHash);

    // 5) Delete (soft)
    const delResp = await fetch(`${base}/records/${record.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessor: 'smoke-tester' }),
    });
    const delRes = await delResp.json();
    console.log('Delete response:', delRes);

    // 6) List records for patient and show metadata for deleted
    await wait(300);
    const listResp = await fetch(`${base}/records?patientId=${patient.id}`);
    const list = await listResp.json();
    console.log('Records for patient (count):', Array.isArray(list) ? list.length : list);
    if (Array.isArray(list)) {
      for (const r of list) {
        console.log(' -', r.id, 'deleted=', r.metadata?.deleted || false);
      }
    }

    console.log('Smoke test completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Smoke test error:', err);
    process.exit(1);
  }
}

run();
