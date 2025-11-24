# django/seeds/utils.py
from pathlib import Path
import shutil

def sync_tree(src: Path, dst: Path, clear: bool = False, mode: str = "copy"):
    """
    Sync directory tree from src -> dst.
    - clear=True removes dst before placing new content.
    - mode='copy' (default) or 'symlink'.
    """
    dst = Path(dst)
    src = Path(src)
    if not src.exists():
        return False

    if clear and dst.exists():
        shutil.rmtree(dst)
    dst.mkdir(parents=True, exist_ok=True)

    if mode == "symlink":
        # symlink each item
        for item in src.iterdir():
            link = dst / item.name
            if link.exists() or link.is_symlink():
                if link.is_dir():
                    shutil.rmtree(link)
                else:
                    link.unlink()
            link.symlink_to(item, target_is_directory=item.is_dir())
    else:
        # copy each item; replace dirs if they exist
        for item in src.iterdir():
            target = dst / item.name
            if item.is_dir():
                if target.exists():
                    shutil.rmtree(target)
                shutil.copytree(item, target)
            else:
                shutil.copy2(item, target)

    return True
