# UyService — Supabase serverini bir marta sozlash (Windows PowerShell).
# Loyiha papkasida ishga tushiring:
#   powershell -ExecutionPolicy Bypass -File supabase\setup.ps1
#
# Skript o'zi qiladi: Supabase'ga kirish va loyihani ulash, jadvallar (migratsiyalar), server funksiyalari,
# sirlar (CRON_SECRET, Telegram), Telegram webhook va "Ochish" tugmasi, .env fayli. Oxirida SQL Editor'ga
# qo'yiladigan 2 qatorni nusxalab, sahifani o'zi ochadi.
# Maxfiy qiymatlar (bot tokeni) ekranda ko'rinmaydi va faylga yozilmaydi — faqat Supabase sirlariga ketadi.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

function Step([string]$text) { Write-Host "`n== $text" -ForegroundColor Green }
function Run([string]$what, [scriptblock]$cmd) {
  & $cmd
  if ($LASTEXITCODE -ne 0) { Write-Host "XATO: $what. Yuqoridagi xabarni nusxalab yuboring." -ForegroundColor Red; exit 1 }
}

Step "Tekshiruv"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js o'rnatilmagan: https://nodejs.org (LTS) — o'rnating va PowerShell oynasini qayta oching." -ForegroundColor Red
  exit 1
}
Write-Host "Node.js: $(node --version)"

Write-Host "`nSupabase → Project Settings → API sahifasidan:"
$url = (Read-Host "Project URL (https://XXXX.supabase.co)").Trim().TrimEnd('/')
$ref = $url -replace '^https?://', '' -replace '\.supabase\.co.*$', ''
if ($ref -notmatch '^[a-z0-9]{10,40}$') { Write-Host "Project URL noto'g'ri: $url" -ForegroundColor Red; exit 1 }
$url = "https://$ref.supabase.co"
$anon = (Read-Host "anon public (yoki publishable) kalit — service_role EMAS").Trim()
if ($anon -match 'service_role' -or $anon -like 'sb_secret_*') { Write-Host "Bu maxfiy kalit! anon/publishable kalitni kiriting." -ForegroundColor Red; exit 1 }

Step "1/6 Supabase'ga kirish (brauzer ochiladi → Authorize)"
Run "supabase login" { npx --yes supabase login }
Write-Host "Ma'lumotlar bazasi paroli so'raladi — loyiha yaratishda o'ylagan parol."
Run "supabase link" { npx --yes supabase link --project-ref $ref }

Step "2/6 Jadvallar (migratsiyalar)"
Run "db push" { npx --yes supabase db push --include-all }

Step "3/6 Server funksiyalari"
Run "functions deploy" { npx --yes supabase functions deploy --use-api }

Step "4/6 Sirlar"
$cron = [guid]::NewGuid().ToString('N')
$hook = [guid]::NewGuid().ToString('N')
$sec = Read-Host "Telegram bot tokeni (@BotFather bergan; ekranda ko'rinmaydi; hali bo'lmasa — Enter)" -AsSecureString
$token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
$secrets = @("CRON_SECRET=$cron", "APP_URL=https://uyservice.uz")
if ($token) { $secrets += "TELEGRAM_BOT_TOKEN=$token"; $secrets += "TELEGRAM_WEBHOOK_SECRET=$hook" }
Run "secrets set" { npx --yes supabase secrets set @secrets }

if ($token) {
  Step "5/6 Telegram bot"
  $wh = Invoke-RestMethod "https://api.telegram.org/bot$token/setWebhook" -Method Post -Body @{ url = "$url/functions/v1/telegram-bot"; secret_token = $hook }
  Write-Host "Webhook: $($wh.ok) $($wh.description)"
  $menu = @{ menu_button = @{ type = 'web_app'; text = 'Ochish'; web_app = @{ url = 'https://uyservice.uz' } } } | ConvertTo-Json -Depth 5
  $mb = Invoke-RestMethod "https://api.telegram.org/bot$token/setChatMenuButton" -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($menu))
  Write-Host "Menyu tugmasi (Ochish → uyservice.uz): $($mb.ok)"
} else {
  Step "5/6 Telegram bot — o'tkazib yuborildi (token kiritilmadi). Keyin skriptni qayta ishga tushiring."
}

Step "6/6 .env va SQL"
$envLines = @()
if (Test-Path .env) { $envLines = Get-Content .env | Where-Object { $_ -notmatch '^EXPO_PUBLIC_SUPABASE_(URL|ANON_KEY)=' } }
$envLines += "EXPO_PUBLIC_SUPABASE_URL=$url"
$envLines += "EXPO_PUBLIC_SUPABASE_ANON_KEY=$anon"
Set-Content -Path .env -Value $envLines -Encoding UTF8
Write-Host ".env yangilandi (git'ga yuklanmaydi)."

$sql = @"
select public.schedule_offer_timeout('$url', '$cron');
select public.configure_push('$url', '$cron');
"@
Set-Clipboard -Value $sql
Write-Host "`nSQL Editor'ga qo'yiladigan 2 qator (nusxalandi — Ctrl+V, keyin Run):" -ForegroundColor Yellow
Write-Host $sql
Start-Process "https://supabase.com/dashboard/project/$ref/sql/new"

Write-Host "`nCloudflare (sayt) uchun — Settings → Build → Variables and secrets:" -ForegroundColor Yellow
Write-Host "  EXPO_PUBLIC_SUPABASE_URL      = $url"
Write-Host "  EXPO_PUBLIC_SUPABASE_ANON_KEY = $anon"
Write-Host "`nTayyor. Skriptni qayta ishga tushirsangiz, SQL qatorlarini ham qayta bajaring (sir yangilanadi)." -ForegroundColor Green
