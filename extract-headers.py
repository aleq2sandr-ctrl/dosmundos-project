import re

# Read the backup file
with open('/tmp/supabase-backup-2026-02-09T10-52-09-postgres.sql', 'r') as f:
    content = f.read()

# Find ALL ES timecodes (not just time=0)
pattern = r'^([0-9a-f-]+)\t(\d{4}-\d{2}-\d{2})\tes\t(\d+)\t([^\t]+)\t'
matches = re.findall(pattern, content, re.MULTILINE)

# Get first timecode for each episode (sorted by time)
episodes = {}
for match in matches:
    uuid, slug, time_str, title = match
    time_val = int(time_str)
    if slug not in episodes:
        episodes[slug] = {'time': time_val, 'title': title, 'uuid': uuid}
    elif time_val < episodes[slug]['time']:
        episodes[slug] = {'time': time_val, 'title': title, 'uuid': uuid}

print(f'Found {len(episodes)} ES episodes')
print()

# Print result
for slug in sorted(episodes.keys()):
    ep = episodes[slug]
    print(f'{slug}\t{ep["time"]}\t{ep["title"]}')
