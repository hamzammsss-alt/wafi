import React, { useEffect, useMemo, useState } from 'react';
import { AccountingEngineClient } from '../../../services/accountingEngineClient';

type AccountOption = {
  id: string;
  code?: string;
  name?: string;
  is_posting?: number;
  posting_allowed?: number;
  is_transactional?: number;
};

type LineState = {
  account_id: string;
  debit: number;
  credit: number;
  sub_account_id: string;
  reference_type: string;
  reference_id: string;
  line_description: string;
};

const emptyLine = (): LineState => ({
  account_id: '',
  debit: 0,
  credit: 0,
  sub_account_id: '',
  reference_type: 'CUSTOMER',
  reference_id: '',
  line_description: ''
});

const referenceTypes = ['CUSTOMER', 'SUPPLIER', 'EMPLOYEE', 'BANK', 'GENERAL'];

const UnifiedAEVoucherPage: React.FC = () => {
  const [voucherType, setVoucherType] = useState('JOURNAL');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<LineState[]>([emptyLine()]);

  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [subAccountsByAccount, setSubAccountsByAccount] = useState<Record<string, any[]>>({});
  const [referencesByType, setReferencesByType] = useState<Record<string, any[]>>({});

  const [drafts, setDrafts] = useState<any[]>([]);
  const [trialBalance, setTrialBalance] = useState<any[]>([]);

  const [newSubAccountName, setNewSubAccountName] = useState('');
  const [newSubAccountParent, setNewSubAccountParent] = useState('');
  const [newReferenceType, setNewReferenceType] = useState('CUSTOMER');
  const [newReferenceName, setNewReferenceName] = useState('');

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const postingAccounts = useMemo(() => {
    return accounts.filter((a) => {
      const posting = a.is_posting ?? a.posting_allowed ?? a.is_transactional ?? 1;
      return Number(posting) === 1;
    });
  }, [accounts]);

  const loadSeedData = async () => {
    const [accs, allDrafts] = await Promise.all([
      window.electronAPI.getAccounts(),
      AccountingEngineClient.getVouchers({ status: 'DRAFT' })
    ]);

    setAccounts(Array.isArray(accs) ? accs : []);
    setDrafts(Array.isArray(allDrafts) ? allDrafts : []);

    const allRefs = await AccountingEngineClient.listReferences();
    const grouped: Record<string, any[]> = {};
    (Array.isArray(allRefs) ? allRefs : []).forEach((ref) => {
      const key = String(ref.ref_type || '').toUpperCase() || 'GENERAL';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(ref);
    });
    setReferencesByType(grouped);
  };

  useEffect(() => {
    loadSeedData().catch((e) => setMessage(String(e?.message || e)));
  }, []);

  const setLine = (idx: number, patch: Partial<LineState>) => {
    setLines((prev) => prev.map((line, i) => (i === idx ? { ...line, ...patch } : line)));
  };

  const onAccountChanged = async (idx: number, accountId: string) => {
    setLine(idx, { account_id: accountId, sub_account_id: '' });
    if (!accountId) return;

    if (!subAccountsByAccount[accountId]) {
      const subAccounts = await AccountingEngineClient.listSubAccounts(accountId);
      setSubAccountsByAccount((prev) => ({ ...prev, [accountId]: Array.isArray(subAccounts) ? subAccounts : [] }));
    }
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const toPayload = () => ({
    voucher_type: voucherType,
    voucher_date: voucherDate,
    description,
    currency_code: 'ILS',
    exchange_rate: 1,
    lines: lines.map((l) => ({
      account_id: l.account_id,
      debit: Number(l.debit || 0),
      credit: Number(l.credit || 0),
      sub_account_id: l.sub_account_id || null,
      reference_type: l.reference_type || null,
      reference_id: l.reference_id || null,
      line_description: l.line_description || null
    }))
  });

  const saveDraft = async () => {
    setBusy(true);
    setMessage('');
    try {
      const res = await AccountingEngineClient.saveDraftVoucher(toPayload());
      setMessage(`Draft saved: ${res?.voucher_no || res?.id || ''}`);
      await loadSeedData();
    } catch (e: any) {
      setMessage(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const postNow = async () => {
    setBusy(true);
    setMessage('');
    try {
      const res = await AccountingEngineClient.postVoucher(toPayload());
      setMessage(`Posted: ${res?.voucher_no || res?.id || ''}`);
      await loadSeedData();
    } catch (e: any) {
      setMessage(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const postDraft = async (id: string) => {
    setBusy(true);
    setMessage('');
    try {
      await AccountingEngineClient.postDraftVoucher(id);
      setMessage('Draft posted successfully');
      await loadSeedData();
    } catch (e: any) {
      setMessage(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const createSubAccount = async () => {
    if (!newSubAccountParent || !newSubAccountName.trim()) return;
    setBusy(true);
    setMessage('');
    try {
      await AccountingEngineClient.createSubAccount({
        account_id: newSubAccountParent,
        name: newSubAccountName.trim()
      });
      const subAccounts = await AccountingEngineClient.listSubAccounts(newSubAccountParent);
      setSubAccountsByAccount((prev) => ({ ...prev, [newSubAccountParent]: Array.isArray(subAccounts) ? subAccounts : [] }));
      setNewSubAccountName('');
      setMessage('Sub-account created');
    } catch (e: any) {
      setMessage(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const createReference = async () => {
    if (!newReferenceType || !newReferenceName.trim()) return;
    setBusy(true);
    setMessage('');
    try {
      await AccountingEngineClient.createReference({
        ref_type: newReferenceType,
        ref_name: newReferenceName.trim()
      });
      const refs = await AccountingEngineClient.listReferences(newReferenceType);
      setReferencesByType((prev) => ({ ...prev, [newReferenceType]: Array.isArray(refs) ? refs : [] }));
      setNewReferenceName('');
      setMessage('Reference created');
    } catch (e: any) {
      setMessage(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const loadTrialBalance = async () => {
    setBusy(true);
    setMessage('');
    try {
      const rows = await AccountingEngineClient.getTrialBalance();
      setTrialBalance(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      setMessage(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Unified AE Voucher</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 12 }}>
        <div>
          <label>Voucher Type</label>
          <select value={voucherType} onChange={(e) => setVoucherType(e.target.value)}>
            <option value="JOURNAL">JOURNAL</option>
            <option value="RECEIPT">RECEIPT</option>
            <option value="PAYMENT">PAYMENT</option>
            <option value="OPENING">OPENING</option>
            <option value="CLOSING">CLOSING</option>
            <option value="TRANSFER">TRANSFER</option>
          </select>
        </div>
        <div>
          <label>Date</label>
          <input type="date" value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)} />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label>Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Account</th>
            <th>Debit</th>
            <th>Credit</th>
            <th>Sub Account</th>
            <th>Ref Type</th>
            <th>Reference</th>
            <th>Description</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, idx) => (
            <tr key={idx}>
              <td>
                <select value={line.account_id} onChange={(e) => onAccountChanged(idx, e.target.value)}>
                  <option value="">Select</option>
                  {postingAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{`${a.code || ''} - ${a.name || a.id}`}</option>
                  ))}
                </select>
              </td>
              <td>
                <input type="number" value={line.debit} onChange={(e) => setLine(idx, { debit: Number(e.target.value || 0) })} />
              </td>
              <td>
                <input type="number" value={line.credit} onChange={(e) => setLine(idx, { credit: Number(e.target.value || 0) })} />
              </td>
              <td>
                <select value={line.sub_account_id} onChange={(e) => setLine(idx, { sub_account_id: e.target.value })}>
                  <option value="">None</option>
                  {(subAccountsByAccount[line.account_id] || []).map((s) => (
                    <option key={s.id} value={s.id}>{`${s.code || ''} ${s.name || ''}`.trim()}</option>
                  ))}
                </select>
              </td>
              <td>
                <select value={line.reference_type} onChange={(e) => setLine(idx, { reference_type: e.target.value, reference_id: '' })}>
                  {referenceTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </td>
              <td>
                <select value={line.reference_id} onChange={(e) => setLine(idx, { reference_id: e.target.value })}>
                  <option value="">None</option>
                  {(referencesByType[line.reference_type] || []).map((r) => (
                    <option key={r.id} value={r.id}>{`${r.ref_code || ''} ${r.ref_name || ''}`.trim()}</option>
                  ))}
                </select>
              </td>
              <td>
                <input value={line.line_description} onChange={(e) => setLine(idx, { line_description: e.target.value })} />
              </td>
              <td>
                <button type="button" onClick={() => removeLine(idx)} disabled={lines.length <= 1}>X</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button type="button" onClick={addLine}>Add Line</button>
        <button type="button" onClick={saveDraft} disabled={busy}>Save Draft</button>
        <button type="button" onClick={postNow} disabled={busy}>Post Now</button>
      </div>

      <hr style={{ margin: '16px 0' }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
        <div>
          <h3>Create Sub Account</h3>
          <select value={newSubAccountParent} onChange={(e) => setNewSubAccountParent(e.target.value)}>
            <option value="">Parent account</option>
            {postingAccounts.map((a) => (
              <option key={a.id} value={a.id}>{`${a.code || ''} - ${a.name || a.id}`}</option>
            ))}
          </select>
          <input
            placeholder="Sub-account name"
            value={newSubAccountName}
            onChange={(e) => setNewSubAccountName(e.target.value)}
          />
          <button type="button" onClick={createSubAccount} disabled={busy}>Create</button>
        </div>

        <div>
          <h3>Create Reference</h3>
          <select value={newReferenceType} onChange={(e) => setNewReferenceType(e.target.value)}>
            {referenceTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            placeholder="Reference name"
            value={newReferenceName}
            onChange={(e) => setNewReferenceName(e.target.value)}
          />
          <button type="button" onClick={createReference} disabled={busy}>Create</button>
        </div>
      </div>

      <hr style={{ margin: '16px 0' }} />

      <h3>Draft Vouchers</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>No</th>
            <th>Type</th>
            <th>Date</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {drafts.map((d) => (
            <tr key={d.id}>
              <td>{d.voucher_no}</td>
              <td>{d.voucher_type}</td>
              <td>{d.voucher_date}</td>
              <td>{d.status}</td>
              <td>
                <button type="button" onClick={() => postDraft(d.id)} disabled={busy}>Post Draft</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr style={{ margin: '16px 0' }} />

      <h3>Trial Balance</h3>
      <button type="button" onClick={loadTrialBalance} disabled={busy}>Load Trial Balance</button>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Debit</th>
            <th>Credit</th>
            <th>Net</th>
          </tr>
        </thead>
        <tbody>
          {trialBalance.map((r) => (
            <tr key={r.account_id}>
              <td>{r.account_code}</td>
              <td>{r.account_name}</td>
              <td>{r.total_debit}</td>
              <td>{r.total_credit}</td>
              <td>{r.net_balance}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
};

export default UnifiedAEVoucherPage;
