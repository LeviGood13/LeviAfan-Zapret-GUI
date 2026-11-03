// Dependency-free ZIP (deflate) and RAR5 (store) packaging.
// RAR5 format: https://www.rarlab.com/technote.htm
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=(typeof process!=='undefined'&&process.argv[2])||path.join(root,'release');
await fs.mkdir(out,{recursive:true});
const version='1.1.0',base=`LeviAfan-Zapret-${version}-Windows`;
const entries=[];
async function add(name,source=name){entries.push({name:`LeviAfan-Zapret-${version}/${name}`,data:await fs.readFile(path.join(root,source))});}
for(const name of (await fs.readdir(root)).sort())if((name.startsWith('general')&&name.endsWith('.bat'))||['service.bat','LeviAfan-Zapret.exe','LICENSE.txt'].includes(name))await add(name);
for(const dir of ['bin','lists','utils','.service'])for(const name of (await fs.readdir(path.join(root,dir))).sort()){
 if(name.includes('-user')||name==='game_filter.enabled'||name.endsWith('.leviafan.bak'))continue;
 if((await fs.stat(path.join(root,dir,name))).isFile())await add(`${dir}/${name}`);
}
await add('README.md','README-LeviAfan.md');
await add('LICENSE-GUI.txt','gui/LICENSE.txt');
entries.push({name:`LeviAfan-Zapret-${version}/START-HERE.txt`,data:Buffer.from('\ufeffLeviAfan • Версия 1.1.0\r\n\r\n1. Распакуйте ВСЮ папку из архива.\r\n2. Запустите LeviAfan-Zapret.exe и подтвердите UAC.\r\n3. Выберите стратегию и нажмите «Запустить».\r\n4. Для дополнительных адресов откройте «Адреса и списки».\r\n\r\nНужен Windows 10/11 и .NET Framework 4.8. Установщик не требуется.\r\nНе переносите EXE отдельно от bin, lists, utils и .service.\r\nИнструкция: README.md. Автор интерфейса: LeviAfan.\r\n')});
const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;}
function crc32(b){let c=0xffffffff;for(const v of b)c=table[(c^v)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function u32(v){const b=Buffer.alloc(4);b.writeUInt32LE(v>>>0);return b;}
function vint(v){const a=[];do{let b=v%128;v=Math.floor(v/128);a.push(b|(v?128:0));}while(v);return Buffer.from(a);}
function block(body){const b=Buffer.concat([vint(body.length),body]);return Buffer.concat([u32(crc32(b)),b]);}
const rar=[Buffer.from([0x52,0x61,0x72,0x21,0x1a,0x07,0x01,0]),block(Buffer.from([1,0,0]))];
for(const e of entries){const name=Buffer.from(e.name);const b=Buffer.concat([vint(2),vint(2),vint(e.data.length),vint(4),vint(e.data.length),vint(32),u32(crc32(e.data)),vint(0),vint(0),vint(name.length),name]);rar.push(block(b),e.data);}
rar.push(block(Buffer.from([5,0,0])));
await fs.writeFile(path.join(out,base+'.rar'),Buffer.concat(rar));
const local=[],central=[];let offset=0;const dosDate=((2026-1980)<<9)|(11<<5)|4;
for(const e of entries){const name=Buffer.from(e.name),compressed=deflateRawSync(e.data,{level:9}),crc=crc32(e.data);const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(8,8);h.writeUInt16LE(dosDate,12);h.writeUInt32LE(crc,14);h.writeUInt32LE(compressed.length,18);h.writeUInt32LE(e.data.length,22);h.writeUInt16LE(name.length,26);local.push(h,name,compressed);const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(8,10);c.writeUInt16LE(dosDate,14);c.writeUInt32LE(crc,16);c.writeUInt32LE(compressed.length,20);c.writeUInt32LE(e.data.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);central.push(c,name);offset+=h.length+name.length+compressed.length;}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
await fs.writeFile(path.join(out,base+'.zip'),Buffer.concat([...local,directory,end]));
let checksums='';for(const ext of ['zip','rar']){const name=base+'.'+ext;const data=await fs.readFile(path.join(out,name));checksums+=createHash('sha256').update(data).digest('hex')+'  '+name+'\n';console.log(name+': '+data.length+' bytes');}
await fs.writeFile(path.join(out,'SHA256SUMS.txt'),checksums);
await fs.writeFile(path.join(out,'release-notes.md'),'# LeviAfan GUI 1.1.0\n\nГотовая portable-сборка для Windows 10/11 (.NET Framework 4.8).\n\nСкачайте ZIP или RAR, распакуйте целиком и откройте LeviAfan-Zapret.exe. Установка не требуется.\n\n- Все 22 стратегии, дополнительные домены и исключения.\n- Настройки фильтров, сервисные инструменты и работа в трее.\n- Обновлённый интерфейс; панель инструментов проверена при 780×600.\n- Лицензии исходных компонентов сохранены.\n\nRAR5 использует хранение без сжатия; содержимое ZIP и RAR одинаковое. Контрольные суммы — SHA256SUMS.txt.\n\nАвтор интерфейса: LeviAfan.\n');
console.log('Packaged '+entries.length+' runtime files.');
