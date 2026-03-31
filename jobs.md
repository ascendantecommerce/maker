1. Generate speech to text for each segment.
2. Generate first frame for each segment if continuity is new_scene
3. Generate video for each segment. If segment is continue, it should get last frame from previus segment and use it as reference.
4. Generate captions for audio files from step 1 as soon as files are ready.

- max concurrency for audio generation, speech to text should be 4 at a time
