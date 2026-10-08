# UyService - serverni yangilash (yangi migratsiyalar va funksiyalar). setup.ps1 bir marta ishlatilgan bo'lsa,
# keyingi safar faqat shu skript kerak: sirlar, cron va Telegram o'zgarmaydi (SQL Editor'da hech narsa qilish shart emas).
# Loyiha papkasida:
#   git pull
#   powershell -ExecutionPolicy Bypass -File supabase\update.ps1
# Fayl faqat ASCII belgilarda (Windows PowerShell 5.1).
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

function Step([string]$text) { Write-Host "`n== $text" -ForegroundColor Green }
function Run([string]$what, [scriptblock]$cmd) {
  & $cmd
  if ($LASTEXITCODE -ne 0) { Write-Host "XATO: $what. Yuqoridagi xabarni nusxalab yuboring." -ForegroundColor Red; exit 1 }
}

if (-not (Test-Path supabase\.temp\project-ref)) {
  Write-Host "Loyiha ulanmagan. Avval: npx supabase login, keyin npx supabase link --project-ref <REF>" -ForegroundColor Red
  exit 1
}

Step "1/2 Jadvallar (yangi migratsiyalar)"
Write-Host "Ma'lumotlar bazasi paroli so'ralishi mumkin - loyiha yaratishda o'ylagan parol."
Run "db push" { npx --yes supabase db push --include-all }

Step "2/2 Server funksiyalari"
Run "functions deploy" { npx --yes supabase functions deploy --use-api }

Write-Host "`nTayyor. Sayt (uyservice.uz) GitHub'dan o'zi yangilanadi." -ForegroundColor Green
