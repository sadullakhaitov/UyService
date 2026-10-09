// Ro'yxatni CSV (Excel) faylga yuklab olish. Brauzerda — fayl, telefonda — ulashish oynasi.
// Excel o'zbek/rus harflarini to'g'ri ochishi uchun UTF-8 BOM, ajratuvchi — nuqtali vergul.
import { Platform, Share } from 'react-native';

function toCsv(header: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    let s = v == null ? '' : String(v);
    // Formula in'ektsiyasidan himoya (=, +, -, @ bilan boshlangan matn)
    if (/^[=+\-@]/.test(s) && typeof v !== 'number') s = `'${s}`;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [header, ...rows].map((r) => r.map(esc).join(';')).join('\r\n');
}

export async function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const csv = toCsv(header, rows);
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  await Share.share({ message: csv, title: filename }).catch(() => {});
}

/** "uyservice-ustalar-2026-10-07.csv" */
export const csvName = (what: string) => `uyservice-${what}-${new Date().toISOString().slice(0, 10)}.csv`;
