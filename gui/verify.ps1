$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$assembly=[Reflection.Assembly]::LoadFile((Join-Path (Split-Path $PSScriptRoot -Parent) 'LeviAfan-Zapret.exe'))
$t=$assembly.GetType('MainForm')
$normalize=$t.GetMethod('Normalize')
$r=$normalize.Invoke($null,@("https://EXAMPLE.com/test`nexample.com`nпример.рф",'list-general-user.txt'))
if($r -notmatch 'xn--' -or ($r.Split("`n") | Where-Object { $_.Trim() -eq 'example.com' }).Count -ne 1){throw 'Domain normalization failed'}
foreach($case in @(@('bad&domain.com','list-general-user.txt'),@('1.2.3.4/55','ipset-exclude-user.txt'))){$rejected=$false;try{$normalize.Invoke($null,$case)|Out-Null}catch{$rejected=$true};if(!$rejected){throw 'Invalid entry accepted'}}
$source=Get-Content (Join-Path $PSScriptRoot 'Main.cs') -Raw
$repo=Split-Path $PSScriptRoot -Parent
$count=0
Get-ChildItem $repo -Filter 'general*.bat' | ForEach-Object {
 $text=Get-Content $_.FullName -Raw
 $at=$text.IndexOf('winws.exe"',[StringComparison]::OrdinalIgnoreCase)
 if($at -lt 0){throw 'No strategy command'}
 $args=$text.Substring($at+10).Replace("^`r`n",' ').Replace("^`n",' ').Replace('^!','!').Trim()
 if(!$args.StartsWith('--wf-') -or $args.Contains('^')){throw "Cannot parse $($_.Name)"}
 $count++
}
"PASS: domain/IDN normalization, duplicates, invalid domains, CIDR rejection, $count strategy commands"
