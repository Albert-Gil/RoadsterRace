"""Prepare supplied WAVs without modifying originals. Requires Python and ffmpeg.

Usage: python tools/prepare-audio.py path/to/audio_files.zip [additional.wav ...]
Originals/report are kept in ignored artifacts/audio; only runtime MP3s ship.
"""
import array
import hashlib
import io
import json
import math
import pathlib
import shutil
import subprocess
import sys
import wave
import zipfile

LOOPS = {'asphalt_drifting', 'sand_sliding', 'coastal_launch', 'launchsite', 'golden_gate', 'santa_monica', 'Electric_motor'}
AMBIENCE = {'coastal_launch', 'launchsite', 'golden_gate', 'santa_monica'}
NAMES = LOOPS | {'menu_background', 'menu_confirmation', 'menu_selection', 'back_cancel', 'countdown_tick', 'race_start', 'hop_thrusters', 'heavy_landing', 'barrier_impact', 'car_to_car_impact', 'forward_thrust', 'water_splash', 'race_finished', 'car_recovery'}
root = pathlib.Path(__file__).resolve().parents[1]
source = root / 'artifacts/audio/source'
prepared = root / 'artifacts/audio/prepared'
output = root / 'public/audio'
for folder in (source, prepared, output):
    folder.mkdir(parents=True, exist_ok=True)
ffmpeg = shutil.which('ffmpeg') or r'C:\Program Files\ffmpeg\bin\ffmpeg.exe'
report_file = root / 'artifacts/audio/preparation.json'
report = json.loads(report_file.read_text()) if report_file.exists() else []

def sources(paths):
    for path in map(pathlib.Path, paths):
        if path.suffix.lower() == '.zip':
            with zipfile.ZipFile(path) as z:
                for entry in z.infolist():
                    if pathlib.PurePosixPath(entry.filename).name != entry.filename:
                        raise ValueError(f'Unexpected zip entry: {entry.filename}')
                    yield pathlib.PurePosixPath(entry.filename), z.read(entry)
        else:
            yield pathlib.PurePosixPath(path.name), path.read_bytes()

for name, raw in sources(sys.argv[1:]):
        if name.suffix.lower() != '.wav' or name.stem not in NAMES:
            raise ValueError(f'Unexpected entry: {name.name}')
        (source / name.name).write_bytes(raw)
        if name.stem == 'menu_background':
            # Stream long music at runtime. Preserve its musical length; only
            # soften the outer 8 ms instead of shortening a bar with overlap.
            info = json.loads(subprocess.check_output([shutil.which('ffprobe') or r'C:\Program Files\ffmpeg\bin\ffprobe.exe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', str(source / name.name)]))
            duration = float(info['format']['duration'])
            mp3 = output / 'menu_background.mp3'
            filters = f'loudnorm=I=-20:TP=-2:LRA=9,afade=t=in:d=0.008,afade=t=out:st={duration-.008}:d=0.008'
            subprocess.run([ffmpeg, '-y', '-hide_banner', '-loglevel', 'error', '-i', str(source / name.name), '-af', filters, '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', '160k', '-map_metadata', '-1', str(mp3)], check=True)
            item = {'source': name.name, 'sha256': hashlib.sha256(raw).hexdigest(), 'sourceSeconds': duration, 'runtimeSeconds': duration, 'musicLoudnessTargetLUFS': -20, 'bytes': mp3.stat().st_size}
            report = [r for r in report if r['source'] != name.name] + [item]
            continue
        with wave.open(io.BytesIO(raw)) as w:
            rate, channels, frames = w.getframerate(), w.getnchannels(), w.getnframes()
            if w.getsampwidth() != 2 or w.getcomptype() != 'NONE':
                raise ValueError('Expected uncompressed 16-bit PCM WAV')
            pcm = array.array('h', w.readframes(frames))
            if sys.byteorder != 'little':
                pcm.byteswap()
        data = [[pcm[i * channels + c] / 32768 for c in range(channels)] for i in range(frames)]
        # Mono-compatible gameplay; retain stereo space only for venue beds.
        if name.stem not in AMBIENCE:
            data = [[sum(frame) / channels] for frame in data]
        start, end = 0, frames
        if name.stem not in LOOPS:
            audible = [i for i, frame in enumerate(data) if max(map(abs, frame)) >= 0.002]
            if not audible:
                raise ValueError(f'Silent file: {name.name}')
            start = max(0, audible[0] - int(rate * .005))
            end = min(frames, audible[-1] + int(rate * .03))
            data = data[start:end]
        else:
            fade = int(rate * (.25 if name.stem in AMBIENCE else .08))
            seam = [[data[-fade + i][c] * (1 - i / fade) + data[i][c] * i / fade for c in range(len(data[0]))] for i in range(fade)]
            data = data[fade:-fade] + seam
        rms = math.sqrt(sum(v * v for frame in data for v in frame) / (len(data) * len(data[0])))
        peak = max(abs(v) for frame in data for v in frame)
        gain = min(10 ** (-18 / 20) / max(rms, 1e-9), .85 / max(peak, 1e-9))
        encoded = array.array('h', (round(v * gain * 32767) for frame in data for v in frame))
        if sys.byteorder != 'little':
            encoded.byteswap()
        wav = prepared / name.name
        with wave.open(str(wav), 'wb') as w:
            w.setnchannels(len(data[0])); w.setsampwidth(2); w.setframerate(rate); w.writeframes(encoded.tobytes())
        mp3 = output / f'{name.stem.lower()}.mp3'
        subprocess.run([ffmpeg, '-y', '-hide_banner', '-loglevel', 'error', '-i', str(wav), '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', '128k' if name.stem in AMBIENCE else '96k', '-map_metadata', '-1', str(mp3)], check=True)
        report = [r for r in report if r['source'] != name.name]
        report.append({'source': name.name, 'sha256': hashlib.sha256(raw).hexdigest(), 'sourceSeconds': frames / rate, 'runtimeSeconds': len(data) / rate, 'trimStartSeconds': start / rate, 'gainDb': 20 * math.log10(gain), 'peak': peak * gain, 'rms': rms * gain, 'bytes': mp3.stat().st_size})
report_file.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'files': len(report), 'runtimeBytes': sum(r['bytes'] for r in report)}, indent=2))
