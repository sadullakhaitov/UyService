# UyService Reels — ovoz: hikoya (espeak-ng WAV'lari) + animatsiya effektlari + yengil fon musiqasi → bitta WAV (48 kHz, stereo).
# Effektlarning hammasi shu yerda sintez qilinadi (tashqi fayl, litsenziya muammosi yo'q).
#   python audio.py events.json voice_dir out.wav
import json, sys, wave
import numpy as np
from scipy.signal import resample_poly, butter, sosfilt

SR = 48000
rng = np.random.default_rng(7)
ev = json.load(open(sys.argv[1]))
vdir, out = sys.argv[2], sys.argv[3]
N = int(ev['duration'] * SR)
voice = np.zeros(N); fx = np.zeros(N); music = np.zeros(N)

def t_(d): return np.arange(int(d * SR)) / SR
def env(n, a=0.005, r=None):
    e = np.ones(n); ai = max(1, int(a * SR)); e[:ai] = np.linspace(0, 1, ai)
    if r: ri = min(n, int(r * SR)); e[-ri:] *= np.linspace(1, 0, ri) ** 2
    return e
def add(buf, x, at, g=1.0):
    i = int(at * SR)
    if i >= len(buf) or i + len(x) <= 0: return
    j = min(len(buf), i + len(x)); buf[max(0, i):j] += g * x[max(0, -i):j - i]
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)

# ---------- effektlar ----------
def pop():
    t = t_(0.12); f = 900 * np.exp(-t * 28) + 260
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 38) * 0.55
def drop():
    t = t_(0.16); f = 500 + 1600 * (t / 0.16) ** 0.6
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30) * 0.45
def whoosh(d=0.45):
    n = int(d * SR); x = rng.standard_normal(n); t = np.arange(n) / n
    y = np.zeros(n)
    for k, c in enumerate(np.linspace(400, 3200, 8)):  # ko'tariluvchi filtr
        seg = slice(int(k * n / 8), int((k + 1) * n / 8)); y[seg] = bp(x, c * 0.6, c * 1.4)[seg]
    return y * np.sin(np.pi * t) ** 1.5 * 0.35
def rise():
    t = t_(0.5); f = 220 + 500 * t / 0.5
    return (bp(rng.standard_normal(len(t)), 300, 2500) * 0.15 + np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.08) * np.sin(np.pi * t / 0.5)
def tap():
    t = t_(0.06); return (np.sin(2 * np.pi * 1800 * t) * 0.5 + bp(rng.standard_normal(len(t)), 2000, 6000) * 0.4) * np.exp(-t * 90)
def bell(f0, d=0.9, g=0.4):
    t = t_(d); y = sum(a * np.sin(2 * np.pi * f0 * m * t) * np.exp(-t * (3 + 4 * m)) for m, a in [(1, 1), (2.01, .4), (3.02, .2), (4.1, .1)])
    return y * env(len(t), 0.003) * g
def ring():  # telefon chaqiruvi (qisqa)
    t = t_(0.5); y = (np.sin(2 * np.pi * 440 * t) + np.sin(2 * np.pi * 480 * t)) * (np.sin(2 * np.pi * 20 * t) > 0)
    return y * env(len(t), 0.01, 0.05) * 0.12
def tick():
    t = t_(0.025); return np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 200) * 0.25
def engine(d):  # usta yo'lda — yumshoq g'uvullash
    t = t_(d); base = np.sin(2 * np.pi * 70 * t) + 0.5 * np.sin(2 * np.pi * 140 * t + 0.3)
    return lp(base + 0.3 * rng.standard_normal(len(t)), 300) * np.sin(np.pi * t / d) * 0.1

phones_done = 0
for e in ev['events']:
    k, at = e['k'], e['t']
    if k == 'pop': add(fx, pop(), at)
    elif k == 'drop': add(fx, drop(), at)
    elif k == 'whoosh': add(fx, whoosh(), at)
    elif k == 'rise': add(fx, rise(), at)
    elif k == 'tap': add(fx, tap(), at); add(fx, bell(1320, 0.4, 0.15), at + 0.02)
    elif k == 'go':
        nxt = [x['t'] for x in ev['events'] if x['k'] == 'arrive' and x['t'] > at]
        add(fx, engine((nxt[0] if nxt else at + 3) - at), at)
    elif k == 'arrive': add(fx, bell(988, 1.0, 0.3), at); add(fx, bell(1319, 1.0, 0.25), at + 0.12)
    elif k == 'count':
        for i in range(18): add(fx, tick(), at + e['d'] * (1 - (1 - i / 18) ** 2))
    elif k == 'ding': add(fx, bell(1568, 1.2, 0.35), at)
    elif k == 'success':
        for i, f in enumerate([523, 659, 784, 1047]): add(fx, bell(f, 1.0, 0.25), at + i * 0.09)
    elif k == 'brand':
        for i, f in enumerate([784, 988, 1175, 1568]): add(fx, bell(f, 1.4, 0.22), at + i * 0.07)
# 2-sahnadagi telefonlar: har biri chiqqanda qisqa jiringlash
st = ev['starts']
for x in [e['t'] for e in ev['events'] if e['k'] == 'pop' and st[1] <= e['t'] < st[2]][1:]:
    add(fx, ring(), x)

# ---------- fon musiqasi: yumshoq akkordlar + engil ritm (96 BPM) ----------
bpm = 96; beat = 60 / bpm
chords = [[220, 277.2, 329.6], [196, 246.9, 293.7], [174.6, 220, 261.6], [196, 246.9, 329.6]]  # A, G, F, G(sus)
bar = 4 * beat; nb = int(ev['duration'] / bar) + 1
for b in range(nb):
    t0 = b * bar; ch = chords[b % 4]; t = t_(bar + 0.3)
    pad = sum(np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) for f in ch)
    add(music, lp(pad, 1800) * env(len(t), 0.25, 0.4) * 0.05, t0)
    for q in range(4):
        tk = t_(0.25); kick = np.sin(2 * np.pi * (110 * np.exp(-tk * 25) + 45) * tk) * np.exp(-tk * 14)
        add(music, kick * 0.16, t0 + q * beat)
        hat = bp(rng.standard_normal(int(0.05 * SR)), 6000, 12000) * np.exp(-np.arange(int(0.05 * SR)) / SR * 80)
        add(music, hat * 0.05, t0 + q * beat + beat / 2)

# ---------- hikoya ----------
for i, s0 in enumerate(st):
    with wave.open(f'{vdir}/v{i}.wav') as w:
        sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768.0
    x = resample_poly(x, SR, sr)
    x = sosfilt(butter(2, 90, 'high', fs=SR, output='sos'), x)
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
    add(voice, x, s0 + 0.25)

# Ovoz paytida musiqa pasayadi (ducking)
vel = np.convolve(np.abs(voice), np.ones(int(0.12 * SR)) / int(0.12 * SR), 'same')
duck = 1 - 0.6 * np.clip(vel / 0.05, 0, 1)
duck = np.convolve(duck, np.ones(int(0.2 * SR)) / int(0.2 * SR), 'same')
music *= duck
fade = np.ones(N); fi = int(1.5 * SR); fade[-fi:] = np.linspace(1, 0, fi)
mix = (voice * 1.0 + fx * 0.8 + music * 1.0) * fade
mix = np.tanh(mix * 1.1) / np.tanh(1.1)  # yumshoq cheklagich
mix *= 0.89 / (np.max(np.abs(mix)) + 1e-9)
L = mix; R = mix.copy()
# effektlarga biroz kenglik (stereo)
R[int(0.012 * SR):] = (mix[int(0.012 * SR):] - 0.2 * fx[:-int(0.012 * SR)] * 0.8 * fade[int(0.012 * SR):]) 
st_ = np.stack([L, R], 1)
st_ = np.clip(st_, -1, 1)
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st_ * 32767).astype('<i2').tobytes())
print('ok', out, round(N / SR, 2), 's', 'peak', round(float(np.max(np.abs(st_))), 3))
