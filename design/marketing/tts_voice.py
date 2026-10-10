# Ishlatish: python tts_voice.py <papka>   (pip install espeakng-loader; RATE, PITCH, VOICE — muhit o'zgaruvchilari)
# O'zbekcha matn → espeak-ng turk ovozi (o'zbek tovushlariga yaqinroq) → har sahna uchun WAV + uzunliklar
import json, re, subprocess, sys, wave, os
LINES = [
  "Uyda kran oqsa, kimga qo'ng'iroq qilasiz?",
  "Tanishingizga. U esa, boshqa tanishiga.",
  "Biz buni, bitta tugmaga aylantirdik.",
  "Muammoni tanlaysiz. Masalan, santexnik.",
  "Eng yaqin usta keladi. Xaritada kelayotganini ko'rasiz.",
  "Usta ko'rib narx aytadi. Siz ilovada tasdiqlaysiz.",
  "Chaqiruv, ellik ming so'm. Ish qilinsa, narx ichida.",
  "O'ttiz kun kafolat.",
  "Keyingi safar kran oqsa, kimga qo'ng'iroq qilasiz? Uy Servis!",
]
def tr(s):
    s = s.replace('ʻ', "'").replace('’', "'")
    s = re.sub(r"[Oo]'", lambda m: 'O' if m.group(0)[0] == 'O' else 'o', s)
    s = re.sub(r"[Gg]'", lambda m: 'Ğ' if m.group(0)[0] == 'G' else 'ğ', s)
    for a, b in [('Sh', 'Ş'), ('sh', 'ş'), ('Ch', 'Ç'), ('ch', 'ç'), ('qi', 'kı'), ('Qi', 'Kı'), ('q', 'k'), ('Q', 'K'), ('x', 'h'), ('X', 'H'), ('j', 'c'), ('J', 'C')]:
        s = s.replace(a, b)
    return s.replace("'", '')
out = sys.argv[1]
voice, rate, pitch = os.environ.get('VOICE', 'tr'), os.environ.get('RATE', '165'), os.environ.get('PITCH', '42')
durs = []
for i, l in enumerate(LINES):
    f = os.path.join(out, f'v{i}.wav')
    r = subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), 'tts_say.py'), tr(l), f, voice, rate, pitch], capture_output=True, text=True, check=True)
    durs.append(round(float(r.stdout.split()[1]), 3))
    print(i, durs[-1], tr(l))
json.dump({'lines': LINES, 'durations': durs}, open(os.path.join(out, 'voice.json'), 'w'), ensure_ascii=False, indent=1)
