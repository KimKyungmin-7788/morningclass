// 외부 라이브러리 없이 .xlsx(엑셀) 파일을 직접 만든다 (압축 없는 zip + 최소 OOXML).
// 기존 buildXlsx 를 그대로 옮긴 것 — 서식 번호(s): 1 머리글, 2 가운데, 3 왼쪽, 4 제목, 5 합계, 6 굵게, 7 소수 한 자리

export type XlsxCell = string | number | null | { v: string | number; s?: number };
export interface XlsxSheet { name: string; rows: XlsxCell[][]; widths?: number[] }

let crcTable: Uint32Array | null = null;

export function buildXlsx(sheets: XlsxSheet[]): Blob {
  const enc=new TextEncoder();
  const x=(t: string | number)=>String(t).replace(/[&<>"]/g,(c)=>(({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}) as Record<string,string>)[c]).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
  const col=(n: number)=>{ let r=''; n++; while(n>0){ const m=(n-1)%26; r=String.fromCharCode(65+m)+r; n=Math.floor((n-1)/26); } return r; };
  const sheetXml=(sh: XlsxSheet)=>{
    const rows=sh.rows.map((row,ri)=>`<row r="${ri+1}">`+row.map((c,ci)=>{
      if(c==null||c==='') return '';
      const o=(typeof c==='object')?c:{v:c}; const ref=col(ci)+(ri+1), st=o.s?` s="${o.s}"`:'';
      return typeof o.v==='number' ? `<c r="${ref}"${st}><v>${o.v}</v></c>` : `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${x(o.v)}</t></is></c>`;
    }).join('')+'</row>').join('');
    const cols=sh.widths?`<cols>${sh.widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols>`:'';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${rows}</sheetData></worksheet>`;
  };
  const F=(b: number,sz: number,clr?: string)=>`<font>${b?'<b/>':''}<sz val="${sz}"/>${clr?`<color rgb="${clr}"/>`:''}<name val="맑은 고딕"/></font>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="0.0"/></numFmts>
<fonts count="3">${F(0,11)}${F(1,11)}${F(1,15)}</fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE9FF"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF94A3B8"/></left><right style="thin"><color rgb="FF94A3B8"/></right><top style="thin"><color rgb="FF94A3B8"/></top><bottom style="thin"><color rgb="FF94A3B8"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const files=[
    ['[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sh,i)=>`<sheet name="${x(sh.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml',styles],
    ...sheets.map((sh,i)=>[`xl/worksheets/sheet${i+1}.xml`,sheetXml(sh)])
  ];
  // zip (저장만 하고 압축은 하지 않음)
  let T=crcTable; if(!T){ T=crcTable=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; T[n]=c>>>0; } }
  const table=T; const crc=(u: Uint8Array)=>{ let c=0xFFFFFFFF; for(let i=0;i<u.length;i++) c=table[(c^u[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; };
  const parts: BlobPart[]=[], central: Uint8Array[]=[]; let off=0;
  (files as [string,string][]).forEach(([name,txt])=>{
    const nb=enc.encode(name), data=enc.encode(txt), cr=crc(data);
    const lh=new DataView(new ArrayBuffer(30)); lh.setUint32(0,0x04034b50,true); lh.setUint16(4,20,true); lh.setUint16(6,0x0800,true);
    lh.setUint32(14,cr,true); lh.setUint32(18,data.length,true); lh.setUint32(22,data.length,true); lh.setUint16(26,nb.length,true);
    parts.push(new Uint8Array(lh.buffer),nb,data);
    const ch=new DataView(new ArrayBuffer(46)); ch.setUint32(0,0x02014b50,true); ch.setUint16(4,20,true); ch.setUint16(6,20,true); ch.setUint16(8,0x0800,true);
    ch.setUint32(16,cr,true); ch.setUint32(20,data.length,true); ch.setUint32(24,data.length,true); ch.setUint16(28,nb.length,true); ch.setUint32(42,off,true);
    central.push(new Uint8Array(ch.buffer),nb);
    off+=30+nb.length+data.length;
  });
  const csz=central.reduce((a,u)=>a+u.length,0);
  const end=new DataView(new ArrayBuffer(22)); end.setUint32(0,0x06054b50,true); end.setUint16(8,files.length,true); end.setUint16(10,files.length,true); end.setUint32(12,csz,true); end.setUint32(16,off,true);
  return new Blob([...parts,...(central as BlobPart[]),new Uint8Array(end.buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
