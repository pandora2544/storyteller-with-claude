# ดึงคลิปพร้อมโพสต์จาก GitHub Releases ลงโฟลเดอร์ในเครื่อง
# รันเองได้: คลิกขวา > Run with PowerShell  ·  install-sync.bat ตั้งให้รันเองทุก 30 นาที
# repo private: ตั้งตัวแปร GITHUB_TOKEN (fine-grained token อ่าน Contents ได้) ใน Windows แล้วสคริปต์จะใช้เอง
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Repo = 'pandora2544/storyteller-with-claude'
$Dest = Join-Path ([Environment]::GetFolderPath('Desktop')) 'คลิปพร้อมโพสต์'
$Log  = Join-Path $Dest 'sync-log.txt'
New-Item -ItemType Directory -Force -Path $Dest | Out-Null
function Write-Log($m) { $line = "{0:yyyy-MM-dd HH:mm}  {1}" -f (Get-Date), $m; Write-Host $line; Add-Content -Path $Log -Value $line -Encoding UTF8 }

$headers = @{ 'User-Agent' = 'trend-clips-sync'; 'Accept' = 'application/vnd.github+json' }
if ($env:GITHUB_TOKEN) { $headers['Authorization'] = "Bearer $env:GITHUB_TOKEN" }

try {
  $releases = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases?per_page=30" -Headers $headers
} catch {
  Write-Log "เชื่อม GitHub ไม่ได้: $($_.Exception.Message)"; exit 1
}

$slotName = @{ 'am' = 'เช้า'; 'pm' = 'เย็น' }
$new = 0
foreach ($r in $releases) {
  if ($r.tag_name -notmatch '^d-(\d{4})(\d{2})(\d{2})-(am|pm)$') { continue }
  $label = "{0}-{1}-{2} {3}" -f $Matches[1], $Matches[2], $Matches[3], $slotName[$Matches[4]]
  $folder = Join-Path $Dest $label
  $stamp = Join-Path $folder '.synced'
  $asset = $r.assets | Where-Object { $_.name -like '*.zip' } | Select-Object -First 1
  if (-not $asset) { continue }
  if ((Test-Path $stamp) -and ((Get-Content $stamp -Raw).Trim() -eq [string]$asset.updated_at)) { continue }

  $zip = Join-Path $env:TEMP "$($r.tag_name).zip"
  try {
    if ($env:GITHUB_TOKEN) {
      $h = $headers.Clone(); $h['Accept'] = 'application/octet-stream'
      Invoke-WebRequest -Uri $asset.url -Headers $h -OutFile $zip -UseBasicParsing
    } else {
      Invoke-WebRequest -Uri $asset.browser_download_url -Headers @{ 'User-Agent' = 'trend-clips-sync' } -OutFile $zip -UseBasicParsing
    }
    if (Test-Path $folder) { Get-ChildItem $folder -Force | Remove-Item -Recurse -Force }
    Expand-Archive -Path $zip -DestinationPath $folder -Force
    Remove-Item $zip -Force
    Set-Content -Path $stamp -Value ([string]$asset.updated_at) -Encoding ASCII
    (Get-Item $stamp -Force).Attributes = 'Hidden'
    Write-Log "ได้คลิปใหม่: $label — $($r.name)"
    $new++
  } catch {
    Write-Log "ดาวน์โหลด $($r.tag_name) ไม่สำเร็จ: $($_.Exception.Message)"
  }
}
if ($new -gt 0) {
  try {
    Add-Type -AssemblyName System.Windows.Forms
    $n = New-Object System.Windows.Forms.NotifyIcon
    $n.Icon = [System.Drawing.SystemIcons]::Information
    $n.Visible = $true
    $n.ShowBalloonTip(8000, 'คลิปพร้อมโพสต์', "มีคลิปใหม่ $new คลิป — เปิดโฟลเดอร์ คลิปพร้อมโพสต์ บน Desktop", 'Info')
    Start-Sleep -Seconds 9; $n.Dispose()
  } catch {}
}
