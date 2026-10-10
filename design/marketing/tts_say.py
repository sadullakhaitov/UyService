# espeak-ng (ctypes) → WAV; foydalanish: say.py "matn" out.wav [voice] [rate] [pitch]
import ctypes, sys, wave, espeakng_loader
lib = ctypes.CDLL(espeakng_loader.get_library_path())
CB = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.POINTER(ctypes.c_short), ctypes.c_int, ctypes.c_void_p)
buf = []
@CB
def cb(wav, n, ev):
    if n > 0: buf.append(ctypes.string_at(wav, n * 2))
    return 0
sr = lib.espeak_Initialize(2, 0, espeakng_loader.get_data_path().encode(), 0)  # AUDIO_OUTPUT_SYNCHRONOUS
lib.espeak_SetSynthCallback(cb)
text, out = sys.argv[1], sys.argv[2]
voice = sys.argv[3] if len(sys.argv) > 3 else 'uz'
lib.espeak_SetVoiceByName(voice.encode())
lib.espeak_SetParameter(1, int(sys.argv[4]) if len(sys.argv) > 4 else 150, 0)  # rate
lib.espeak_SetParameter(3, int(sys.argv[5]) if len(sys.argv) > 5 else 50, 0)   # pitch
t = text.encode('utf-8')
lib.espeak_Synth(t, len(t) + 1, 0, 0, 0, 0x01, None, None)  # espeakCHARS_UTF8
lib.espeak_Synchronize()
with wave.open(out, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(b''.join(buf))
print(sr, sum(len(b) for b in buf) / 2 / sr)
