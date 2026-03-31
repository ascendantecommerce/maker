import sys, subprocess, tempfile, os, struct, wave, warnings
warnings.filterwarnings("ignore")
import torch, math, requests

def download_and_convert(url):
    tmpdir = tempfile.mkdtemp()
    video = os.path.join(tmpdir, "v.mp4")
    wav = os.path.join(tmpdir, "a.wav")
    r = requests.get(url, stream=True, verify=False)
    with open(video, "wb") as f:
        for c in r.iter_content(8192): f.write(c)
    subprocess.run(["ffmpeg", "-y", "-i", video, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav],
                   check=True, capture_output=True)
    return wav

def get_rms_frames(wav_path, frame_ms=10):
    with wave.open(wav_path, "rb") as wf:
        sr = wf.getframerate()
        sw = wf.getsampwidth()
        spf = int(sr * frame_ms / 1000)
        results = []
        t = 0.0
        while True:
            raw = wf.readframes(spf)
            if len(raw) < spf * sw: break
            data = struct.unpack(f"<{spf}h", raw)
            rms = math.sqrt(sum(x*x for x in data) / spf)
            db = 20 * math.log10(rms / 32768.0) if rms > 0 else -100.0
            results.append((t, db))
            t += frame_ms / 1000.0
        return results

def test_onsets(frames, win_start, win_end):
    window = [f for f in frames if win_start <= f[0] <= win_end]
    min_db = min(f[1] for f in window)
    
    onset_d = win_start
    for t, db in window:
        if db > -35.0:
            onset_d = t
            break
            
    return {"Strategy D (-35dB)": onset_d}

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/silero_sf36_detail.py <URL>")
        return
    url = sys.argv[1]
    wav_path = download_and_convert(url)
    model, utils = torch.hub.load("snakers4/silero-vad", "silero_vad", force_reload=False)
    (get_speech_timestamps, _, read_audio, _, _) = utils
    wav = read_audio(wav_path, sampling_rate=16000)
    segs = get_speech_timestamps(wav, model, sampling_rate=16000, threshold=0.5, return_seconds=True)
    if not segs: return
    
    frames = get_rms_frames(wav_path)
    res = test_onsets(frames, segs[0]["start"], segs[0]["start"] + 2.0)
    print(f"Onset: {res['Strategy D (-35dB)']:.3f}s")

if __name__ == "__main__":
    main()
