"""Technical full-frame WebP conversion; preserves diagram/text content."""
from pathlib import Path
import subprocess, argparse, imageio_ffmpeg
root=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser()
parser.add_argument('--source',type=Path,required=True,help='Directory containing the16 original numbered PNG cards')
source=parser.parse_args().source.resolve()
target=root/'public/cards';target.mkdir(parents=True,exist_ok=True)
for p in sorted(source.glob('*.png')):
    n=p.name[:2]
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-loglevel','error','-y','-i',str(p),'-vf','scale=800:1200','-c:v','libwebp','-quality','88',str(target/f'card-{n}.webp')],check=True)
assert len(list(target.glob('*.webp')))==16
print('PASS: 16 complete-frame WebP cards, 800x1200')
