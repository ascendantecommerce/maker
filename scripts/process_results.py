import subprocess
import os
import requests
import tempfile

VIDEOS = [
    {
        "name": "sf36",
        "url": "https://cdn.scenify.io/ugc-videos/sf36QJMgX4humlsm7znbU/sf36QJMgX4humlsm7znbU-seg-0/trimmed-A0HUk9plA82a-S7cLqkyq.mp4",
        "silence_until": 1.280
    },
    {
        "name": "5rrQ",
        "url": "https://cdn.scenify.io/ugc-videos/5rrQADsi8V3PvJRMvmpd4/5rrQADsi8V3PvJRMvmpd4-seg-0/trimmed-QMIN0cqmfF_enFWckyHYb.mp4",
        "silence_until": 0.820
    },
    {
        "name": "I9On",
        "url": "https://cdn.scenify.io/ugc-videos/I9OnjksVvvfc9a6fz0IDL/I9OnjksVvvfc9a6fz0IDL-seg-2/trimmed-ttwt-7Zod0dc0s8ohUMzF.mp4",
        "silence_until": 0.580
    },
    {
        "name": "3uGrs",
        "url": "https://cdn.scenify.io/ugc-videos/3uGrsfsc5s7IF4CtzSUUx/3uGrsfsc5s7IF4CtzSUUx-seg-2/trimmed-ecuc1K2RXrDWGBBl--dJN.mp4",
        "silence_until": 0.610
    },
    {
        "name": "RAW_SEG2",
        "url": "https://cdn.scenify.io/ugc-videos/HD0W4vJ3HOrPm7xwru5EV/HD0W4vJ3HOrPm7xwru5EV-seg-2/raw-Ti5FuDOmfoK6VQ1c57xLz.mp4",
        "silence_until": 0.170
    },
    {
        "name": "RAW_SEG1",
        "url": "https://cdn.scenify.io/ugc-videos/HD0W4vJ3HOrPm7xwru5EV/HD0W4vJ3HOrPm7xwru5EV-seg-1/raw-P-cb1i-xDfD-AjydSuvaj.mp4",
        "silence_until": 0.520
    }
]

output_dir = "/Users/dev/.gemini/antigravity/brain/8799789c-7361-4e6a-98db-fcb869225cfb/processed_videos"
os.makedirs(output_dir, exist_ok=True)

LEAD_IN = 0.3 # Final 300ms buffer

for v in VIDEOS:
    print(f"Processing {v['name']}...")
    raw_path = os.path.join(tempfile.gettempdir(), f"{v['name']}_raw.mp4")
    out_path = os.path.join(output_dir, f"{v['name']}_silenced.mp4")
    
    adjusted_silence = max(0, v['silence_until'] - LEAD_IN)
    
    r = requests.get(v['url'])
    with open(raw_path, 'wb') as f:
        f.write(r.content)
    
    cmd = [
        "ffmpeg", "-y", "-i", raw_path,
        "-af", f"volume=0:enable='between(t,0,{adjusted_silence})'",
        "-c:v", "copy",
        out_path
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    print(f"  Saved to {out_path}")
